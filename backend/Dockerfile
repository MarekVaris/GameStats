FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "app.py"]


#gcloud artifacts repositories create gamestats --repository-format=docker --location=us-central1 --description="GameStats" --immutable-tags --async
#gcloud auth configure-docker us-central1-docker.pkg.dev
#gcloud builds submit --tag us-central1-docker.pkg.dev/gamestats-462112/gamestats/gamestatsimg:1.0