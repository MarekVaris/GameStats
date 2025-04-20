from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

STEAM_API_KEY = os.getenv('STEAM_API_KEY')

@app.route('/api/steam')
def get_steam_data():
    url = f"https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?key={STEAM_API_KEY}"
    try:
        res = requests.get(url)
        data = res.json()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
