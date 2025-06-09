from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import csv 
import time

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
STEAM_API_KEY = os.getenv("STEAM_API_KEY")

CSV_FILE_METADATA = os.path.join(BASE_DIR, "SteamGamesMetadata.csv")
CSV_FILE_ALL_HISTORY = os.path.join(BASE_DIR, "Clean_SteamHistory_PCout.csv")
CSV_FILE_ALL_APPLIST = os.path.join(BASE_DIR, "SteamAppsList.csv")

BAD_FETCHING_APPIDS_FILE = os.path.join(BASE_DIR, "bad_fetching_appids.txt")
with open(BAD_FETCHING_APPIDS_FILE, "r", encoding="utf-8") as f:
    BAD_APPIDS = set(line.strip() for line in f if line.strip())

#########################################################
#####################   FUNCTIONS   #####################
#########################################################

fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]

# JUST FOR NOW IN CSV
# creating a CSV file if it doesn"t exist
# with the headers: appid, name, header_image
def check_csv_if_metadata_exist():
    if not os.path.isfile(CSV_FILE_METADATA):
        with open(CSV_FILE_METADATA, "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
        return False
    else:
        return True
    
# Get current playes for game
# Input: appid
# Output: appid, name, date_playerscount - for database
def get_current_players(appid, name):
    with open(CSV_FILE_ALL_HISTORY, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["appid"] == str(appid):
                return row

    try:
        if name is None or appid is None:
            raise ValueError("Appid and name must be provided.")

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

        with open(CSV_FILE_ALL_HISTORY, "a", newline="",  encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["appid", "name", "date_playerscount"])
            writer.writerow(all_data)
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
        if check_csv_if_metadata_exist():
            with open(CSV_FILE_METADATA, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                return [row for row in reader]
        else:
            return []

    # Check if appid is valid            
    if str(appid) in BAD_APPIDS:
        return {
            "appid": appid,
            "name": "Unknown",
            "header_image": "",
        }
    
    # Check if the CSV file exists and has the metadata
    if check_csv_if_metadata_exist():
        with open(CSV_FILE_METADATA, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["appid"] == str(appid):
                    result = {}
                    for data in fieldnames:
                        if data in ["platforms", "categories", "genres", "screenshots"]:
                            result[data] = row[data].split(", ") if row[data] else []
                        else:
                            result[data] = row[data]
                    get_current_players(appid, row["name"])
                    return result

    # If the appid is not found in the CSV, fetch from API and save to CSV
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()

        # Check if data is valid, if not adds appid to the list of bad appids
        if not data.get(appid, {}).get("success"):
            with open(BAD_FETCHING_APPIDS_FILE, "a", encoding="utf-8") as f:
                f.write(appid + "\n")
            BAD_APPIDS.add(appid)
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
    with open(CSV_FILE_METADATA, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerow(result)

    for data in fieldnames:
        if data in ["platforms", "categories", "genres", "screenshots"]:
            result[data] = result[data].split(", ") if result[data] else []
        else:
            result[data] = result[data]
    get_current_players(appid, result["name"])
    return result



# Get all games from CSV file
# Input: current_time (current timestamp in milliseconds)
# Output: list of games with appid, concurrent_in_game, rank
def get_all_games(current_time):
    all_games_return = []

    # Calculate the cutoff time for the last 24 hours
    time_cutoff = current_time - 86400000  

    with open(CSV_FILE_ALL_HISTORY, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            appid = row["appid"]
            if appid in BAD_APPIDS:
                continue

            try:
                last_entry = row["date_playerscount"].split(", ")[-1]
                timestamp_ms_str, last_player_count_str = last_entry.split(" ")
                timestamp_ms = int(timestamp_ms_str)
                last_player_count = int(last_player_count_str)

                if not (time_cutoff <= timestamp_ms <= current_time):
                    continue

                row["concurrent_in_game"] = last_player_count
                del row["date_playerscount"]
            except Exception as e:
                print(f"Failed to parse player count for appid {appid}: {e}")
                continue

            all_games_return.append(row)

    all_games_return.sort(key=lambda x: x["concurrent_in_game"], reverse=True)

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
        current_time = int(time.time() * 1000)

        all_ranks = get_all_games(current_time)
        all_games = fetch_game_metadata()
            
        try:
            for game in all_ranks:
                metadata = look_for_data_in_sorted_list(all_games, int(game["appid"]))
                if metadata is not None:
                    game["name"] = metadata.get("name", "Unknown")
                    game["header_image"] = metadata.get("header_image", "")
                else:
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
        all_games = []

        with open(CSV_FILE_ALL_APPLIST, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                all_games.append({
                    "appid": row["appid"],
                    "name": row["name"]
                })
        if not all_games:
            return jsonify({"error": "No games found"}), 404
        return jsonify(all_games)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RUN THE APP
if __name__ == "__main__":
    app.run(debug=True)