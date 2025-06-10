import csv
import os

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

CSV_FILE_METADATA = os.path.join(BASE_DIR, "SteamGamesMetadata.csv")
CSV_FILE_ALL_HISTORY = os.path.join(BASE_DIR, "Clean_SteamHistory_PCout.csv")
CSV_FILE_ALL_APPLIST = os.path.join(BASE_DIR, "SteamAppsList.csv")

BAD_FETCHING_APPIDS_FILE = os.path.join(BASE_DIR, "bad_fetching_appids.txt")

# BAD_APPIDS CALLING

def get_badappid_data():
    with open(BAD_FETCHING_APPIDS_FILE, "r", encoding="utf-8") as f:
        BAD_APPIDS = set(line.strip() for line in f if line.strip())
    return BAD_APPIDS

def add_badappid(appid):
    with open(BAD_FETCHING_APPIDS_FILE, "a", encoding="utf-8") as f:
        f.write(appid + "\n")

fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]

def check_csv_if_metadata_exist():
    if not os.path.isfile(CSV_FILE_METADATA):
        with open(CSV_FILE_METADATA, "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
        return False
    else:
        return True

# HISTORY PLAYERCOUNT CALLING

def get_history_playercount_by_appid(appid):
    with open(CSV_FILE_ALL_HISTORY, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["appid"] == str(appid):
                return row
    return None
            
def add_history_playercount(data):
    with open(CSV_FILE_ALL_HISTORY, "a", newline="",  encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["appid", "name", "date_playerscount"])
        writer.writerow(data)

def get_from_histroy_playercount_by_time_sorted(BAD_APPIDS):
    all_games_return = []
    
    with open(CSV_FILE_ALL_HISTORY, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            appid = row["appid"]
            if appid in BAD_APPIDS:
                continue

            try:
                last_entry = row["date_playerscount"].split(", ")[-1]
                last_player_count_str = last_entry.split(" ")[1]
                last_player_count = int(last_player_count_str)

                row["concurrent_in_game"] = last_player_count
                del row["date_playerscount"]

            except Exception as e:
                print(f"Failed to parse player count for appid {appid}: {e}")
                continue

            all_games_return.append(row)

    all_games_return.sort(key=lambda x: x["concurrent_in_game"], reverse=True)
    return all_games_return


# METADATA CALLING

def get_all_metadata():
    if check_csv_if_metadata_exist():
        with open(CSV_FILE_METADATA, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return [row for row in reader]
    else:
        return []

def get_metadata_by_appid(appid):
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
                    return result
    return None

def add_metadata(data):
    with open(CSV_FILE_METADATA, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerow(data)

# ALL APPLIST CALLING
def get_all_steam_games():
    all_games = []
    with open(CSV_FILE_ALL_APPLIST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            all_games.append({
                "appid": row["appid"],
                "name": row["name"]
            })
    return all_games