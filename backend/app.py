from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import csv

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STEAM_API_KEY = os.getenv('STEAM_API_KEY')

CSV_FILE_METADATA = os.path.join(BASE_DIR, "SteamGamesMetadata.csv")
CSV_FILE_APPLIST = os.path.join(BASE_DIR, "SteamAppsList.csv")


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

# creating a CSV file for all games
# Output: appid, name
def fetch_steam_apps_list():
    url = f"https://api.steampowered.com/ISteamApps/GetAppList/v2/"
    res = requests.get(url)
    data = res.json()
    app_list = data['applist']['apps']
    if not os.path.isfile(CSV_FILE_APPLIST):
        with open(CSV_FILE_APPLIST, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['appid', 'name'])
            writer.writeheader()
            for app in app_list:
                writer.writerow(app)


# Fetch game metadata from CSV or API
# Input: appid
# Output: appid, name, header_image
# If the appid is not found in the CSV, fetch from API and save to CSV
def fetch_game_metadata(appid: str):    

    if check_csv_if_metadata_exist():
        with open(CSV_FILE_METADATA, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['appid'] == str(appid):
                    return {
                        "appid": appid,
                        "name": row["name"],
                        "header_image": row["header_image"]
                    }

    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    res = requests.get(url)
    data = res.json()
    
    if not data.get(appid, {}).get("success"):
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
    with open(CSV_FILE_METADATA, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writerow(result)

    return result


#########################################################
#####################   API CALLS   #####################
#########################################################


# Top Current Gasmes
# Input: key
# Output: rank, appid, concurrent_in_game, peak_in_game + name, header_image
@app.route('/api/topcurrentgames')
def get_top_current_games():
    url = f"https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/?key={STEAM_API_KEY}"
    try:
        res = requests.get(url)
        data = res.json()
        combine_data = []
        ranks = data['response']['ranks']

        for game in ranks:
            appid = str(game['appid'])
            metadata = fetch_game_metadata(appid)

            combine_data.append({
                "rank": game['rank'],
                "appid": appid,
                "concurrent_in_game": game['concurrent_in_game'],
                "peak_in_game": game['peak_in_game'],
                "name": metadata.get('name') if metadata else "Unknown",
                "header_image": metadata.get('header_image') if metadata else ""
            })

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