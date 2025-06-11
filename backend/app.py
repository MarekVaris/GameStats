from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import asyncio
from flask_executor import Executor

import csv_calling
import fetching_bigdata_csv
import bigquery_calling


load_dotenv()

app = Flask(__name__)
executor = Executor(app)

CORS(app)

USE_BQ = os.getenv("USE_BQ", "").lower() == "true"
STEAM_API_KEY = os.getenv("STEAM_API_KEY")
BAD_APPIDS = csv_calling.get_badappid_data()

#########################################################
#####################   FUNCTIONS   #####################
#########################################################

fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]
    
# Get current playes for game
# Input: appid
# Output: appid, name, date_playerscount - for database
def get_current_history_playercouny(appid, name):
    
    if USE_BQ:
        row = bigquery_calling.BQ_get_history_playercount_by_appid(appid)
    else:
        row = csv_calling.get_history_playercount_by_appid(appid)

    if row is not None:
        return row
    
    try:
        url = f"https://steamcharts.com/app/{appid}/chart-data.json"
        res = requests.get(url, timeout=10)
        data = res.json()
        if not data:
            raise ValueError(f"No data found for appid {appid}.")
        
        all_data = {
            "appid": str(appid),
            "name": name,
            "date_playerscount": ", ".join([f"{entry[0]} {entry[1]}" for entry in data])
        }
        if USE_BQ:
            bigquery_calling.BQ_add_history_playercount(all_data)
        else:
            csv_calling.add_history_playercount(all_data)

        return all_data

    except Exception as e:
        print(f"Error fetching current players for appid {appid}: {e}")
        return None
    
# Fetch game metadata from CSV or API and save it to CSV
# Input: appid
# Output: appid, name, header_image, short_description, developers, publishers,
#  release_date, platforms, price, categories, genres, website, screenshots, background
# OR
# Input: appid=None
# Output: all metadata from CSV
def fetch_game_metadata(appid = None):
    # If appid is None, return all metadata from CSV
    if appid is None:
        if USE_BQ:
            return bigquery_calling.BQ_get_all_metadata()
        else:
            return csv_calling.get_all_metadata()

    # Check if appid is valid            
    if str(appid) in BAD_APPIDS:
        return {
            "appid": appid,
            "name": "Unknown",
            "header_image": "",
        }
    
    # Check if CSV has the metadata
    if USE_BQ:
        result = bigquery_calling.BQ_get_metadata_by_appid(appid)
    else:
        result = csv_calling.get_metadata_by_appid(appid)
    if result is not None:
        return result
    
    # If the appid is not found in the CSV, fetch from API and save to CSV
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()

        # Check if data is valid, if not adds appid to the list of bad appids
        if not data.get(appid, {}).get("success"):
            csv_calling.add_badappid(appid)
            BAD_APPIDS.add(str(appid))
            raise ValueError(f"App ID {appid} not found or API request failed.")
    
    except Exception as e:
        print(f"Error fetching metadata for appid {appid}: {e}")
        return None

    # Changing the data structure to the format
    game_data = data[appid]["data"]
    result = {
        "appid": appid,
        "name": game_data.get("name"),
        "header_image": game_data.get("header_image"),
        "short_description": game_data.get("short_description"),
        "developers": ", ".join(game_data.get("developers", [])),
        "publishers": ", ".join(game_data.get("publishers", [])),
        "release_date": game_data.get("release_date", {}).get("date"),
        "platforms": ", ".join([k for k, v in game_data.get("platforms", {}).items() if v]),
        "price": game_data.get("price_overview", {}).get("final_formatted"),
        "categories": ", ".join([cat["description"] for cat in game_data.get("categories", [])]),
        "genres": ", ".join([genre["description"] for genre in game_data.get("genres", [])]),
        "website": game_data.get("website"),
        "screenshots": ", ".join([s["path_full"] for s in game_data.get("screenshots", [])]),
        "background": game_data.get("background")
    }

    # Save the result
    if USE_BQ:
        bigquery_calling.BQ_add_metadata(result)
    else:
        csv_calling.add_metadata(result)
        

    for data in fieldnames:
        if data in ["platforms", "categories", "genres", "screenshots"]:
            result[data] = result[data].split(", ") if result[data] else []

    return result



# Get all games from CSV file
# Input: current_time (current timestamp in milliseconds)
# Output: list of games with appid, concurrent_in_game, rank
def get_all_top_games_sored():
    if USE_BQ:
        all_games_return = bigquery_calling.BQ_get_current_history_playercount_sorted(BAD_APPIDS)
    else:
        all_games_return = csv_calling.get_current_history_playercount_sorted(BAD_APPIDS)
    for i, game in enumerate(all_games_return, start=1):
        game["rank"] = i

    return all_games_return


#########################################################
#####################   API CALLS   #####################
#########################################################


# Top Current Gasmes
# Input: key
# Output: rank, appid, concurrent_in_game + name, header_image
@app.route("/api/topcurrentgames")
def get_top_current_games():
    try:
        combine_data, all_ranks, all_games = [], [], []
        try:

            if USE_BQ:
                exec_all_ranks = executor.submit(get_all_top_games_sored)
                exec_all_games = executor.submit(fetch_game_metadata)

                all_ranks = exec_all_ranks.result()
                all_games = exec_all_games.result()
            else:
                all_ranks = get_all_top_games_sored()
                all_games = fetch_game_metadata()
        except Exception as e:
            print(f"Error fetching data: {e}")
            return jsonify({"error": "Failed to fetch data"}), 500

        try:
            for game in all_ranks:
                metadata = look_for_data_in_sorted_list(all_games, int(game["appid"]))
                if metadata is not None:
                    game["name"] = metadata.get("name", "Unknown")
                    game["header_image"] = metadata.get("header_image", "")
                else:
                    print(f"Metadata for appid {game['appid']} not found, fetching from API.")
                    try_to_fetch = fetch_game_metadata(game["appid"])
                    if try_to_fetch is None:
                        continue
                    game["name"] = try_to_fetch["name"]
                    game["header_image"] = try_to_fetch["header_image"]

                combine_data.append({
                    "rank": game["rank"],
                    "appid": game["appid"],
                    "concurrent_in_game": game["concurrent_in_game"],
                    "name": game["name"],
                    "header_image": game["header_image"]
                })

        except Exception as e:
            print(f"Error processing game metadata: {e}")
            return jsonify({"error": "Failed to process game metadata"}), 500
        
        return jsonify(combine_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def look_for_data_in_sorted_list(sorted_list, appid):
    low, high = 0, len(sorted_list) - 1
    while low <= high:
        mid = (low + high) // 2
        if int(sorted_list[mid]["appid"]) == appid:
            return sorted_list[mid]
        elif int(sorted_list[mid]["appid"]) < appid:
            low = mid + 1
        else:
            high = mid - 1
    return None


# Get Metadata from appid
# Input: appid
# Output: appid, name, header_image
@app.route("/api/steam/game/<appid>")
def get_game_metadata(appid):
    if not appid.isdigit():
        return jsonify({"error": "Invalid appid format"}), 400

    try:
        metadata = fetch_game_metadata(appid)
        if metadata:
            return jsonify(metadata)
        return jsonify({"error": "Game not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Get all games applist
# Input: query
# Output: list of appids and names
@app.route("/api/steam/search")
def get_search_games():
    try:
        all_games = csv_calling.get_all_steam_games()
        
        if not all_games:
            return jsonify({"error": "No games found"}), 404
        
        return jsonify(all_games)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# @app.route("/update", methods=["POST"])
# def update_entrypoint():
#     if bigquery_calling.try_acquire_lock():
#         task_name = bigquery_calling.create_cloud_task()
#         return jsonify({"status": "Update task enqueued", "task": task_name}), 202
#     else:
#         return jsonify({"status": "Update already running or not due"}), 200

@app.route("/update-task", methods=["POST"])
def update_task_handler():
    try:
        all_data = asyncio.run(fetching_bigdata_csv.get_players_count_history_to_csv())
        bigquery_calling.upload_to_bigquery(all_data)
        return jsonify({"status": "Update finished"}), 200
    
    except Exception as e:
        print(f"Update failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        bigquery_calling.release_lock()


# RUN THE APP
if __name__ == "__main__":
    app.run(debug=True)