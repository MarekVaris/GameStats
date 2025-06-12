import aiohttp
import asyncio
import csv
import os
import requests


BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

CSV_FILE_APPLIST = os.path.join(BASE_DIR, "SteamGamesMetadata.csv")
CSV_FILE_PLAYERSCOUNT_HISTORY = os.path.join(BASE_DIR, "Clean_SteamHistory_PCout.csv")

TXT_FILE_BAD_FETCHING_APPIDS = os.path.join(BASE_DIR, "bad_fetching_appids.txt")

# Create a CSV file with players count history
# Output: appid, name, date_playerscount - Sorted by appid
async def fetch_chart_data(session, appid, name):
    url = f"https://steamcharts.com/app/{appid}/chart-data.json"
    try:
        async with session.get(url) as res:
            if res.status != 200:
                print(f"Failed to fetch data for appid {appid}: {res.status}")
                return None
            data = await res.json()
            date_playerscount = ", ".join([f"{entry[0]} {entry[1]}" for entry in data])
            return {
                "appid": appid,
                "name": name,
                "date_playerscount": date_playerscount
            }
    except Exception as e:
        print(f"Error fetching data for appid {appid}: {e}")
        return None
    
async def get_players_count_history_to_csv():
    appids = []
    names = []
    with open(CSV_FILE_PLAYERSCOUNT_HISTORY, "r", encoding="utf-8") as f:
        bad_appids = set(line.strip() for line in f if line.strip())

    with open(CSV_FILE_APPLIST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["appid"] in bad_appids:
                continue
            appids.append(row["appid"])
            names.append(row["name"])

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_chart_data(session, appid, name) for appid, name in zip(appids, names)]
        results = await asyncio.gather(*tasks)

    fieldnames = ["appid", "name", "date_playerscount"]

    with open(CSV_FILE_PLAYERSCOUNT_HISTORY, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for result in results:
            if result:
                writer.writerow(result)
    return results

if __name__ == "__main__":
    # asyncio.run(get_players_count_history_to_csv())
    None

#########################################################
#########################################################
#########################################################

# creating a CSV file for all games
# Output: appid, name
def fetch_steam_apps_list():
    url = f"https://api.steampowered.com/ISteamApps/GetAppList/v2/"
    res = requests.get(url)
    data = res.json()
    app_list = data["applist"]["apps"]
    if not os.path.isfile(CSV_FILE_APPLIST):
        with open(CSV_FILE_APPLIST, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["appid", "name"])
            writer.writeheader()
            for app in app_list:
                writer.writerow(app)

if __name__ == "__main__":
    # fetch_steam_apps_list()
    None

#########################################################
#########################################################
#########################################################

# Sorting metadata CSV file by appid
# Output: sorted CSV file by appid
def sort_all_metadata():
    fieldnames_metadata = [
        "appid", "name", "header_image", "short_description", "developers",
        "publishers", "release_date", "platforms", "price", "categories",
        "genres", "website", "screenshots", "background"
    ]
    # Sort metadata CSV file by appid
    with open(CSV_FILE_APPLIST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    rows.sort(key=lambda x: int(x["appid"]))
    with open(CSV_FILE_APPLIST, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_metadata)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    # sort_all_metadata()
    None