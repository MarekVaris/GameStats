from dotenv import load_dotenv
from google.cloud import bigquery, tasks_v2
import pandas as pd
import os

load_dotenv()

PROJECT_ID = os.getenv("PROJECT_ID")
HISTORY_TABLE = PROJECT_ID + ".GameStats.history_playercount"
LOCK_TABLE = PROJECT_ID + ".GameStats.update_lock"
REGION = "us-central1"
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
TASK_ENDPOINT = os.getenv("TASK_ENDPOINT")
CLOUD_RUN_URL = os.getenv("CLOUD_RUN_URL")
QUEUE_NAME = "update-queue"

client_bq = bigquery.Client()
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



fieldnames = [
    "appid", "name", "header_image", "short_description", "developers",
    "publishers", "release_date", "platforms", "price", "categories",
    "genres", "website", "screenshots", "background"
]

def BQ_get_history_playercount_by_appid(appid):
    query = f"""
        SELECT *
        FROM `{HISTORY_TABLE}`
        WHERE appid = @appid
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("appid", "STRING", appid)
        ]
    )
    
    try:
        query_job = client_bq.query(query, job_config=job_config)
        result = query_job.result()

    except Exception as e:
        print(f"Error fetching player count history for appid {appid}: {e}")
        return None

    return result
