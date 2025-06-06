from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import csv 

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
STEAM_API_KEY = os.getenv('STEAM_API_KEY')

CSV_FILE_METADATA = os.path.join(BASE_DIR, "SteamGamesMetadata.csv")
CSV_FILE_ALL_GAMES = os.path.join(BASE_DIR, "Clean_SteamHistory_PCout.csv")

# List of appids that are known to have issues fetching metadata
BAD_FETCHING_APPIDS = [
    "243380","219600","3349480","2939590","2147450","201700","105400","1046480","202480","223350",
    "282350","28050","3604320","91310","367540","1418870","255480","1031510", "3669060", "1361350", 
    "2154770", "1874910", "42690", "1630280", "207890", "2586520", "2294090", "41010", "2178420",
    "34000","2066750","1825750","958260","212200"," 96810","624090","223250","111710","237410",
    "223240","91720","302550","243750","244310","72780","2394010","208050","70010","215360",
    "623990","230030","237310","243730","896660","203300","568880","63220","205100","96810",
    "295270","231670","71270","714210","288390"]

#########################################################
#####################   FUNCTIONS   #####################
#########################################################

fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]

# JUST FOR NOW IN CSV
# creating a CSV file if it doesn't exist
# with the headers: appid, name, header_image
def check_csv_if_metadata_exist():
    if not os.path.isfile(CSV_FILE_METADATA):
        with open(CSV_FILE_METADATA, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
        return False
    else:
        return True


# Fetch game metadata from CSV or API
# Input: appid
# Output: appid, name, header_image, short_description, developers, publishers,
#  release_date, platforms, price, categories, genres, website, screenshots, background
def fetch_game_metadata(appid: str = None):
    if appid is None:
        if check_csv_if_metadata_exist():
            with open(CSV_FILE_METADATA, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return [row for row in reader]

    if appid in BAD_FETCHING_APPIDS:
        return None
    # Check if the CSV file exists and has the metadata
    if check_csv_if_metadata_exist():
        with open(CSV_FILE_METADATA, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['appid'] == str(appid):
                    result = {}
                    for data in fieldnames:
                        if data in ["platforms", "categories", "genres", "screenshots"]:
                            result[data] = row[data].split(", ") if row[data] else []
                        else:
                            result[data] = row[data]
                    return result

    # If the appid is not found in the CSV, fetch from API and save to CSV
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()
        if not data.get(appid, {}).get("success"):
            raise ValueError(f"App ID {appid} not found or API request failed.")

    except Exception as e:
        print(f"Error fetching metadata for appid {appid}: {e}")
        return None


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

    with open(CSV_FILE_METADATA, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerow(result)


    return result

# Get all games from CSV file
# Input: ranks_steam (list of top 100 games from Steam API), current_time (current timestamp in milliseconds)
# Output: list of games with appid, concurrent_in_game, rank
def get_all_games(ranks_steam, current_time):
    top_100_appid = set(str(game['appid']) for game in ranks_steam)

    if not os.path.isfile(CSV_FILE_ALL_GAMES):
        print(f"File not found: {CSV_FILE_ALL_GAMES}")
        return []

    remaining_games = []
    # Calculate the cutoff time for the last 24 hours
    time_cutoff = current_time - 86400000  

    with open(CSV_FILE_ALL_GAMES, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            appid = row['appid']
            if appid in top_100_appid:
                continue

            try:
                last_entry = row['date_playerscount'].strip().rsplit(', ', 1)[-1]
                timestamp_ms_str, last_player_count_str = last_entry.split(' ')
                timestamp_ms = int(timestamp_ms_str)
                last_player_count = int(last_player_count_str)

                if not (time_cutoff <= timestamp_ms <= current_time):
                    continue

                row['concurrent_in_game'] = last_player_count
                row['rank'] = 0
                del row['date_playerscount']
            except Exception as e:
                print(f"Failed to parse player count for appid {appid}: {e}")
                continue

            remaining_games.append(row)

    remaining_games.sort(key=lambda x: x['concurrent_in_game'], reverse=True)

    for i, game in enumerate(remaining_games, start=101):
        game['rank'] = i

    return remaining_games[:2200]


#########################################################
#####################   API CALLS   #####################
#########################################################


# Top Current Gasmes
# Input: key
# Output: rank, appid, concurrent_in_game + name, header_image
@app.route('/api/topcurrentgames')
def get_top_current_games():
    print("Fetching top current games from Steam API...")
    url = f"https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/?key={STEAM_API_KEY}"
    try:
        res_from_steam = requests.get(url)
        data = res_from_steam.json()
        combine_data = []
        steam_current_time = data['response']['last_update']
        ranks_steam = data['response']['ranks']

        try:
            ranks_data = get_all_games(ranks_steam, steam_current_time * 1000)
            all_ranks = ranks_steam + ranks_data
 
            all_games = fetch_game_metadata()
            
            for game in all_ranks:
                metadata = next((g for g in all_games if g['appid'] == str(game['appid'])), None)
                if metadata is not None:
                    game["name"] = metadata.get("name", "Unknown")
                    game["header_image"] = metadata.get("header_image", "")
                else:
                    try_to_fetch = fetch_game_metadata(str(game["appid"]))
                    if try_to_fetch:
                        game["name"] = try_to_fetch["name"]
                        game["header_image"] = try_to_fetch["header_image"]
                    else:
                        game["name"] = "Unknown"
                        game["header_image"] = ""

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

# Get Metadata from appid
# Input: appid
# Output: appid, name, header_image
@app.route('/api/steam/game/<appid>')
def get_game_metadata(appid):
    try:
        metadata = fetch_game_metadata(appid)
        if metadata:
            return jsonify(metadata)
        return jsonify({'error': 'Game not found'}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# RUN THE APP
if __name__ == '__main__':
    app.run(debug=True)