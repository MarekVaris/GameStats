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
CSV_FILE = os.path.join(BASE_DIR, "steam_games.csv")
STEAM_API_KEY = os.getenv('STEAM_API_KEY')

# JUST FOR NOW
# creating a CSV file if it doesn't exist
# with the headers: appid, name, header_image
def check_csv_if_exist():
    if not os.path.isfile(CSV_FILE):
        with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['appid', 'name', 'header_image'])
            writer.writeheader()

# Fetch game metadata from CSV or API
# Input: appid
# Output: appid, name, header_image
# If the appid is not found in the CSV, fetch from API and save to CSV
def fetch_game_metadata(appid: str):
    check_csv_if_exist()

    with open(CSV_FILE, 'r', encoding='utf-8') as csvfile:
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
        "header_image": game_data.get("header_image")
    }

    with open(CSV_FILE, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['appid', 'name', 'header_image'])
        writer.writerow(result)

    return result


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
@app.route('/api/steam/<appid>')
def get_game_metadata(appid):
    try:
        metadata = fetch_game_metadata(appid)
        if metadata:
            return jsonify(metadata)
        return jsonify({'error': 'Game not found'}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)