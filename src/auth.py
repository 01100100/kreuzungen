import requests
from flask import Flask, request
from waitress import serve
import redis

from config import get_config_values, get_logger

### SET UP ENVIRONMENT ###
logger = get_logger()
CONFIG = get_config_values()

redis_client = redis.from_url(CONFIG.REDIS_URL)

app = Flask(__name__)


@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.add("Access-Control-Allow-Methods", "POST")
    if request.headers.get("Origin") == CONFIG.FRONTEND_HOST_URL:
        response.headers.add("Access-Control-Allow-Origin", CONFIG.FRONTEND_HOST_URL)
    else:
        pass
    return response


@app.route("/oauth", methods=["POST"])
def oauth_callback():
    code = request.form.get("code")
    response = requests.post(
        f"{CONFIG.STRAVA_API_URL}/oauth/token",
        data={
            "client_id": CONFIG.STRAVA_CLIENT_ID,
            "client_secret": CONFIG.STRAVA_API_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        },
    )
    if response.status_code != 200:
        raise Exception(
            f"Error fetching access token, status code {response.status_code}"
        )
    json_response = response.json()

    refresh_token = json_response.get("refresh_token")
    user_id = json_response.get("athlete").get("id")
    redis_client.set(user_id, refresh_token)

    return json_response


@app.route("/reoauth", methods=["POST"])
def refresh_token():
    refresh_token = request.form.get("refreshToken")
    response = requests.post(
        f"{CONFIG.STRAVA_API_URL}/oauth/token",
        data={
            "client_id": CONFIG.STRAVA_CLIENT_ID,
            "client_secret": CONFIG.STRAVA_API_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    if response.status_code != 200:
        raise Exception(
            f"Error refreshing access token, status code {response.status_code}"
        )
    response.json()

    return response.json()


@app.route("/access_token", methods=["POST"])
def get_access_token():
    user_id = request.form.get("userId")
    refresh_token = redis_client.get(user_id)

    if not refresh_token:
        return {"error": "User not found"}, 404

    response = requests.post(
        f"{CONFIG.STRAVA_API_URL}/oauth/token",
        data={
            "client_id": CONFIG.STRAVA_CLIENT_ID,
            "client_secret": CONFIG.STRAVA_API_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    if response.status_code != 200:
        raise Exception(
            f"Error refreshing access token, status code {response.status_code}"
        )

    return response.json()


if __name__ == "__main__":
    serve(app, listen="*:8080")
