from dotenv import load_dotenv
from google.cloud import bigquery, tasks_v2, bigquery_storage_v1
from concurrent.futures import ThreadPoolExecutor
import requests
import pandas as pd
import os

import app


# Environment Variables
load_dotenv()
PROJECT_ID = os.getenv("PROJECT_ID", "gamestats-462112")
HISTORY_TABLE = PROJECT_ID + ".GameStats.history_playercount"
LOCK_TABLE = PROJECT_ID + ".GameStats.update_lock"
METADATA_TABLE = PROJECT_ID + ".GameStats.steam_metadata"
REGION = "us-central1"
# GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
TASK_ENDPOINT = os.getenv("TASK_ENDPOINT", "/update-task")
CLOUD_RUN_URL = os.getenv("CLOUD_RUN_URL", "https://your-cloud-run-url.com")
QUEUE_NAME = "update-queue"

client_bq = bigquery.Client()
client_storage = bigquery_storage_v1.BigQueryReadClient()
client_tasks = tasks_v2.CloudTasksClient()


# UPDATING TABLES

# Fetches new player count history for games not in the metadata table
def BQ_fetch_new_history_playercount():
    query = f"""
        SELECT appid, name
        FROM `{METADATA_TABLE}`
    """
    try:
        df = client_bq.query(query).to_arrow(bqstorage_client=client_storage).to_pandas()
        data_list = df.to_dict('records')

        steam_top_url = "https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/"
        res = requests.get(steam_top_url)
        if res.status_code != 200:
            print(f"Failed to fetch top sellers: {res.status_code}")
            steam_data = {}
        else:
            steam_data = res.json()
        ranks = steam_data.get("response", {}).get("ranks", [])
        existing_appids = {str(item["appid"]) for item in data_list}
        for data in ranks:
            if str(data["appid"]) not in existing_appids:
                print(f"Fetching metadata for new appid: {data['appid']}")
                new_data = app.fetch_game_metadata(str(data["appid"]))
                data_list.append({"appid": data["appid"], "name": new_data["name"] })

        def fetch_chart_data(appid, name):
            url = f"https://steamcharts.com/app/{appid}/chart-data.json"
            request = requests.get(url)
            if request.status_code != 200:
                print(f"Failed to fetch data for appid {appid}: {request.status_code}")
                return None
            data = request.json()
            date_playerscount = ", ".join([f"{entry[0]} {entry[1]}" for entry in data])
            return {
                "appid": appid,
                "name": name,
                "date_playerscount": date_playerscount
            }

        print(f"Fetching player count history for {len(data_list)} apps...")
        with ThreadPoolExecutor(max_workers=100) as executor:
            futures = [executor.submit(fetch_chart_data, row['appid'], row['name']) for row in data_list]
            data_return = [f.result() for f in futures if f.result() is not None]
        
        return data_return
    
    except Exception as e:
        print(f"Error fetching new player count history: {e}")
        return []

# Tries to acquire a lock for updating player count history
def try_acquire_lock() -> bool:
    query = f"""
    UPDATE `{LOCK_TABLE}`
    SET is_updating = TRUE
    WHERE
      lock_name = "players_update"
      AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_update_time, HOUR) > 12
      AND is_updating = FALSE
    """
    job = client_bq.query(query)
    job.result()
    return job.num_dml_affected_rows == 1

# Releases the lock after updating player count history
def release_lock():
    query = f"""
    UPDATE `{LOCK_TABLE}`
    SET last_update_time = CURRENT_TIMESTAMP(), is_updating = FALSE
    WHERE lock_name = "players_update"
    """
    client_bq.query(query).result()

# https://cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.HttpRequest

# Creates a Cloud Task to update player count history
# def create_cloud_task():
#     parent = client_tasks.queue_path(PROJECT_ID, REGION, QUEUE_NAME)
#     task = {
#         "http_request": {
#             "http_method": tasks_v2.HttpMethod.POST,
#             "url": f"{CLOUD_RUN_URL}{TASK_ENDPOINT}",
#             "headers": {"Content-Type": "application/json"},
#             "oidc_token": {
#                 "service_account_email": f"{PROJECT_ID}@appspot.gserviceaccount.com"
#             },
#         }
#     }
#     response = client_tasks.create_task(parent=parent, task=task)
#     return response.name

# Updates player count history in BigQuery
def upload_to_bigquery(all_data):
    df = pd.DataFrame(all_data)
    df = df.drop_duplicates(subset=["appid","name","date_playerscount"])

    job = client_bq.load_table_from_dataframe(
        df,
        HISTORY_TABLE,
        job_config=bigquery.LoadJobConfig(write_disposition="WRITE_TRUNCATE"),
    )
    job.result()



# HISTORY PLAYERCOUNT CALLING

# Fetches all player count history
def BQ_get_history_playercount_by_appid(appid):
    query = f"""
        SELECT appid, name, date_playerscount
        FROM `{HISTORY_TABLE}`
        WHERE appid = @appid
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("appid", "INT64", int(appid))
        ]
    )
    
    try:
        df = client_bq.query(query, job_config=job_config).to_arrow(bqstorage_client=client_storage).to_pandas()
        result = df.to_dict('records')
        return result

    except Exception as e:
        print(f"Error fetching player count history for appid {appid}: {e}")
        return None

# Fetches the current player count history sorted by concurrent players
def BQ_get_current_history_playercount_sorted():
    query = f"""
        SELECT appid, name, SAFE_CAST(SPLIT(ARRAY_REVERSE(SPLIT(date_playerscount, ', '))[SAFE_OFFSET(0)],' ')[SAFE_OFFSET(1)] AS INT64) AS concurrent_in_game
        FROM `gamestats-462112.GameStats.history_playercount`
        WHERE ARRAY_LENGTH(SPLIT(ARRAY_REVERSE(SPLIT(date_playerscount, ', '))[SAFE_OFFSET(0)], ' ')) > 1
        ORDER BY concurrent_in_game DESC
        LIMIT 7000
    """
    try:
        df = client_bq.query(query).to_arrow(bqstorage_client=client_storage).to_pandas()
        results = df.to_dict('records')
        return results
    
    except Exception as e:
        print(f"Error fetching player count history: {e}")
        return []



# METADATA CALLING

fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]

# Fetches all metadata from the metadata table
def BQ_get_all_metadata():
    query = f"""
        SELECT *
        FROM `{METADATA_TABLE}`
        ORDER BY appid ASC
    """

    try:
        df = client_bq.query(query).to_arrow(bqstorage_client=client_storage).to_pandas()
        results = df.to_dict('records')
        return results

    except Exception as e:
        print(f"Error fetching metadata: {e}")
        return []

# Fetches metadata for a specific appid from the metadata table
def BQ_get_metadata_by_appid(appid):
    query = f"""
        SELECT *
        FROM `{METADATA_TABLE}`
        WHERE appid = @appid
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("appid", "INTEGER", int(appid))
        ]
    )
    try:
        df = client_bq.query(query, job_config=job_config).to_dataframe(bqstorage_client=client_storage)
        rows = df.to_dict('records')

        if not rows:
            return None

        row_dict = rows[0]
        for data in fieldnames:
            if data in ["platforms", "categories", "genres", "screenshots"]:
                row_dict[data] = row_dict[data].split(", ") if row_dict.get(data) else []
                
        return row_dict
    
    except Exception as e:
        print(f"Error fetching metadata for appid {appid}: {e}")
        return None

# Adds metadata to the metadata table
def BQ_add_metadata(data):
    columns = ", ".join(data.keys())
    placeholders = ", ".join([f"@{k}" for k in data.keys()])

    query = f"""
        INSERT INTO `{METADATA_TABLE}` ({columns})
        VALUES ({placeholders})
    """

    query_params = []
    for key, value in data.items():
        if key == "appid":
            param_type = "INTEGER"
        else:
            param_type = "STRING"
        query_params.append(bigquery.ScalarQueryParameter(key, param_type, value))

    job_config = bigquery.QueryJobConfig(query_parameters=query_params)

    try:
        query_job = client_bq.query(query, job_config=job_config)
        query_job.result()
        print(f"Metadata for appid inserted successfully.")
        return data
    
    except Exception as e:
        print(f"Error inserting metadata for appid {data.get('appid', 'unknown')}: {e}")
        return None
    


    
# ALL APPLIST CALLING

# Fetches all steam games from the all_steam_apps table
def BQ_get_all_steam_games():
    query = f"""
        SELECT appid, name
        FROM `{PROJECT_ID}.GameStats.all_steam_apps`
    """
    try:
        df = client_bq.query(query).to_dataframe(bqstorage_client=client_storage)
        results = df.to_dict('records')
        return results
    
    except Exception as e:
        print(f"Error fetching all steam games: {e}")
        return []
