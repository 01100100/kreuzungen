import requests
from flask import Flask, request
from waitress import serve

from config import get_config_values, get_logger

### SET UP ENVIRONMENT ###
logger = get_logger()
CONFIG = get_config_values()

app = Flask(__name__)


@app.after_request
def after_request(response):
    # TODO: restrict this to only the hosted origin.
    # https://01100100.github.io/kreuzungen/index.html
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
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
    response.json()

    return response.json()


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


if __name__ == "__main__":
    serve(app, listen="*:8080")
