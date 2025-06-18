from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
from flask_executor import Executor
import time

import csv_calling
import bigquery_calling

# Initialize Flask app and executor
app = Flask(__name__)
executor = Executor(app)
CORS(app)

# Load environment variables
load_dotenv()
BAD_APPIDS = csv_calling.get_badappid_data()


# Cache for game ranking and metadata
CACHE_DURATION = 12 * 60 * 60

cache_last_fetch_timestamp = 0
cache_game_ranking_topcurplayers= []
cache_all_games_metadata = []


#########################################################
#####################   FUNCTIONS   #####################
#########################################################

# List of fieldnames for game metadata
fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]
    
# Get current playes for game
# Input: appid
# Output: appid, name, date_playerscount - for database
def get_current_history_playercouny(appid): 
    row = bigquery_calling.BQ_get_history_playercount_by_appid(appid)

    if row is not None and row != []:
        return row
    
    try:
        # Fetch current player count data from SteamCharts
        url = f"https://steamcharts.com/app/{appid}/chart-data.json"
        res = requests.get(url, timeout=10)
        data = res.json()
        if not data:
            raise ValueError(f"No data found for appid {appid}.")
        print("data")
        date_playerscount = ", ".join([f"{entry[0]} {entry[1]}" for entry in data])
        # Process the data to get the date and player count
        row = [{
            "appid": int(appid),
            "date_playerscount": date_playerscount,
            "name": ""
        }]
        return row

    except Exception as e:
        print(f"Error fetching current players for appid {appid}: {e}")
        return None
    
# Fetch game metadata from BigQuery or Steam API
# Input: appid
# Output: appid, name, header_image, short_description, developers, publishers,
#  release_date, platforms, price, categories, genres, website, screenshots, background
# OR
# Input: appid=None
# Output: all metadata from CSV
def fetch_game_metadata(appid = None):
    # If appid is None, return all metadata from BigQuery
    if appid is None:
        return bigquery_calling.BQ_get_all_metadata()

    # Check if appid is valid            
    if str(appid) in BAD_APPIDS:
        return {
            "appid": appid,
            "name": "Unknown",
            "header_image": "",
        }

    global cache_all_games_metadata
    result = None
    # Check if appid is already in cache
    if cache_all_games_metadata:
        for row in cache_all_games_metadata:
            if int(row["appid"]) == int(appid):
                result = row.copy()
                for data in fieldnames:
                    if data in ["platforms", "categories", "genres", "screenshots"]:
                        result[data] = result[data].split(", ") if result[data] else []
    
    # If cache is empty, fetch from BigQuery
    if result is None:
        result = bigquery_calling.BQ_get_metadata_by_appid(appid)

    # If found in cache or database return the result
    if result is not None:
        return result
    
    # If not found in cache or CSV, fetch from API
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()

        # Check if the API response contains the appid and success status
        if not data.get(appid, {}).get("success"):
            csv_calling.add_badappid(appid)
            BAD_APPIDS.add(str(appid))
            raise ValueError(f"App ID {appid} not found or API request failed.")
    
    except Exception as e:
        print(f"Error fetching metadata for appid {appid}: {e}")
        return None

    # Parse the response data
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

    # Add metadata to BigQuery
    bigquery_calling.BQ_add_metadata(result)

    for data in fieldnames:
        if data in ["platforms", "categories", "genres", "screenshots"]:
            result[data] = result[data].split(", ") if result[data] else []

    return result



# Get all top games sorted by concurrent players
# Output: appid, name, header_image, concurrent_in_game, rank
def get_all_top_games_sored():
    all_games_return = bigquery_calling.BQ_get_current_history_playercount_sorted()

    # Raking the games based on concurrent_in_game
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
    global cache_last_fetch_timestamp, cache_game_ranking_topcurplayers, cache_all_games_metadata
    combine_data = []
    try:
        # Check if cache is empty or expired
        if not cache_all_games_metadata or not cache_game_ranking_topcurplayers or \
            (int(time.time()) - cache_last_fetch_timestamp >= CACHE_DURATION):
            print("Cache expired or empty, fetching new data.")
            exec_all_ranks = executor.submit(get_all_top_games_sored)
            exec_all_games = executor.submit(fetch_game_metadata)

            cache_game_ranking_topcurplayers = exec_all_ranks.result()
            cache_all_games_metadata = exec_all_games.result()
            cache_last_fetch_timestamp = int(time.time())
    except Exception as e:
        print(f"Error fetching data: {e}")
        return jsonify({"error": "Failed to fetch data"}), 500

    try:
        # Process the cached game ranking data
        for game in cache_game_ranking_topcurplayers:
            metadata = look_for_data_in_sorted_list(cache_all_games_metadata, int(game["appid"]))
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

            # Append the game data to the combined list
            combine_data.append({
                "rank": game["rank"],
                "appid": game["appid"],
                "concurrent_in_game": game["concurrent_in_game"],
                "name": game["name"],
                "header_image": game["header_image"]
            })

        return jsonify(combine_data)
    except Exception as e:
        print(f"Error processing game metadata: {e}")
        return jsonify({"error": "Failed to process game metadata"}), 500
    
    

# Look for data in sorted list by appid
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
    if appid is None or not appid.isdigit():
        return jsonify({"error": "Invalid appid format"}), 400

    try:
        metadata = fetch_game_metadata(appid)
        if metadata:
            return jsonify(metadata)
        return jsonify({"error": "Game not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all metadata
# Input: None
# Output: list of all games metadata
@app.route("/api/steam/allmetadata")
def get_metadata_all():
    global cache_all_games_metadata
    try:
        if not cache_all_games_metadata:
            cache_all_games_metadata = fetch_game_metadata()

        all_metadata = cache_all_games_metadata

        if not all_metadata:
            return jsonify({"error": "No metadata found"}), 404
        
        return jsonify(all_metadata)
    
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

# Get current player count for a game
# Input: appid
# Output: appid, name, date_playerscount
@app.route("/api/steam/playercount/<appid>")
def get_current_playercount(appid):
    try:
        row_of_data = get_current_history_playercouny(appid)
        if row_of_data is None:
            return jsonify({"error": "App ID not found"}), 404
        return jsonify(row_of_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Update the player count history in BigQuery
# This endpoint is for manual triggering of the update task

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
        all_data = executor.submit(bigquery_calling.BQ_fetch_new_history_playercount).result()
        bigquery_calling.upload_to_bigquery(all_data)

        return jsonify({"status": "Update finished"}), 200
    
    except Exception as e:
        print(f"Update failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        bigquery_calling.release_lock()


# RUN THE APP
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)