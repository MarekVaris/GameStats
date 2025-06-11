from dotenv import load_dotenv
from google.cloud import bigquery, tasks_v2, bigquery_storage_v1
import pandas as pd
import os

load_dotenv()

PROJECT_ID = os.getenv("PROJECT_ID")
HISTORY_TABLE = PROJECT_ID + ".GameStats.history_playercount"
LOCK_TABLE = PROJECT_ID + ".GameStats.update_lock"
METADATA_TABLE = PROJECT_ID + ".GameStats.steam_metadata"
REGION = "us-central1"
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
TASK_ENDPOINT = os.getenv("TASK_ENDPOINT")
CLOUD_RUN_URL = os.getenv("CLOUD_RUN_URL")
QUEUE_NAME = "update-queue"

client_bq = bigquery.Client()
client_storage = bigquery_storage_v1.BigQueryReadClient()
client_tasks = tasks_v2.CloudTasksClient()

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

def release_lock():
    query = f"""
    UPDATE `{LOCK_TABLE}`
    SET last_update_time = CURRENT_TIMESTAMP(), is_updating = FALSE
    WHERE lock_name = "players_update"
    """
    client_bq.query(query).result()

# https://cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.HttpRequest

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

def BQ_get_history_playercount_by_appid(appid):
    query = f"""
        SELECT *
        FROM `{HISTORY_TABLE}`
        WHERE appid = @appid
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("appid", "STRING", str(appid))
        ]
    )
    
    try:
        df = client_bq.query(query, job_config=job_config).to_dataframe(bqstorage_client=client_storage)
        result = df.to_dict('records')
        return result

    except Exception as e:
        print(f"Error fetching player count history for appid {appid}: {e}")
        return None

def BQ_add_history_playercount(data):
    query = f"""
        INSERT INTO `{HISTORY_TABLE}` (appid, name, date_playerscount)
        VALUES (@appid, @name, @date_playerscount)
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("appid", "STRING", data["appid"]),
            bigquery.ScalarQueryParameter("name", "STRING", data["name"]),
            bigquery.ScalarQueryParameter("date_playerscount", "STRING", data["date_playerscount"])
        ]
    )

    try:
        query_job = client_bq.query(query, job_config=job_config)
        query_job.result()
        return query_job

    except Exception as e:
        print(f"Error inserting player count history for appid {data['appid']}: {e}")
        return None

def BQ_get_current_history_playercount_sorted(BAD_APPIDS):
    query = f"""
        SELECT appid, name, SAFE_CAST(SPLIT(ARRAY_REVERSE(SPLIT(date_playerscount, ', '))[OFFSET(0)], ' ')[OFFSET(1)] AS INT64) AS concurrent_in_game
        FROM `{HISTORY_TABLE}`
        WHERE appid NOT IN UNNEST(@bad_appids)
        ORDER BY concurrent_in_game DESC
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ArrayQueryParameter("bad_appids", "STRING", BAD_APPIDS)
        ]
    )

    try:
        df = client_bq.query(query, job_config=job_config).to_dataframe(bqstorage_client=client_storage)
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

def BQ_get_all_metadata():
    query = f"""
        SELECT *
        FROM `{METADATA_TABLE}`
        ORDER BY appid ASC
    """

    try:
        df = client_bq.query(query).to_dataframe(bqstorage_client=client_storage)
        results = df.to_dict('records')
        return results

    except Exception as e:
        print(f"Error fetching metadata: {e}")
        return []
    

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

def BQ_add_metadata(data):
    query = f"""
        INSERT INTO `{METADATA_TABLE}` ({", ".join(fieldnames)})
        VALUES ({", ".join([field for field in data])})
    """

    try:
        query_job = client_bq.query(query)
        query_job.result()
        return data
    
    except Exception as e:
        print(f"Error inserting metadata for appid {data['appid']}: {e}")
        return None
    


    
# ALL APPLIST CALLING

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
