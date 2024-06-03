import redis
import requests
from flask import Flask, jsonify, redirect, request
from unique_names_generator import get_random_name
from waitress import serve

from config import get_config_values, get_logger

logger = get_logger()
CONFIG = get_config_values()
redis_client = redis.from_url(CONFIG.REDIS_URL)
app = Flask(__name__)

STRAVA_AUTHORIZE_URL = f"https://www.strava.com/oauth/authorize?client_id={CONFIG.STRAVA_CLIENT_ID}&response_type=code&redirect_uri={CONFIG.FRONTEND_HOST_URL}/index.html?exchange_token&approval_prompt=force&scope=activity:read,activity:read_all,activity:write"
STRAVA_TOKEN_URL = f"{CONFIG.STRAVA_API_URL}/oauth/token"


@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    if request.headers.get("Origin") == CONFIG.FRONTEND_HOST_URL:
        response.headers.add("Access-Control-Allow-Origin", CONFIG.FRONTEND_HOST_URL)
    else:
        pass
    return response


@app.route("/")
def oauth_redirect():
    """Redirects user to Strava OAuth consent page."""
    return redirect(STRAVA_AUTHORIZE_URL, code=302)


@app.route("/oauth", methods=["POST"])
def oauth_callback():
    """Handles OAuth token exchange with Strava."""
    code = request.form.get("code")
    if not code:
        logger.error("Authorization code not provided in callback.")
        return jsonify({"error": "Authorization code not provided."}), 400

    response = requests.post(
        STRAVA_TOKEN_URL,
        data={
            "client_id": CONFIG.STRAVA_CLIENT_ID,
            "client_secret": CONFIG.STRAVA_API_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        },
    )

    if response.status_code != 200:
        logger.error(f"Error fetching access token, status code {response.status_code}")
        return jsonify({"error": "Error fetching access token."}), response.status_code
    logger.info("Oauth token exchange successful.")
    json_response = response.json()
    refresh_token = json_response.get("refresh_token")
    user_id = json_response.get("athlete").get("id")
    redis_client.set(user_id, refresh_token)
    logger.info(f"Refresh token saved for user: {user_id}")
    return {
        "expires_at": json_response.get("expires_at"),
        "access_token": json_response.get("access_token"),
        "refresh_token": json_response.get("refresh_token"),
    }


@app.route("/reoauth", methods=["POST"])
def refresh_token():
    """Handles OAuth token refreshing with Strava."""
    refresh_token = request.form.get("refreshToken")
    if not refresh_token:
        logger.error("Refresh token not provided.")
        return jsonify({"error": "Refresh token not provided."}), 400
    response = requests.post(
        STRAVA_TOKEN_URL,
        data={
            "client_id": CONFIG.STRAVA_CLIENT_ID,
            "client_secret": CONFIG.STRAVA_API_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    if response.status_code != 200:
        logger.error(
            f"Error refreshing access token, status code {response.status_code}"
        )
        return jsonify(
            {"error": "Error refreshing access token."}
        ), response.status_code
    logger.info("Oauth token refresh successful.")
    json_response = response.json()
    return {
        "expires_at": json_response.get("expires_at"),
        "access_token": json_response.get("access_token"),
        "refresh_token": json_response.get("refresh_token"),
    }


@app.route("/save_geojson_feature", methods=["POST"])
def save_geojson_feature():
    """Saves a geoJSON feature to Redis with a friendly name."""
    random_id = get_random_name(separator="_", style="lowercase")
    while redis_client.get(random_id):
        random_id = get_random_name(separator="_", style="lowercase")
    redis_client.set(random_id, request.data)
    logger.info(f"Feature saved with ID: {random_id}")
    return {
        "id": random_id,
        "url": f"{CONFIG.FRONTEND_HOST_URL}/index.html?saved={random_id}",
    }


@app.route("/get_geojson_feature", methods=["GET"])
def get_geojson_feature():
    """Retrieves a geoJSON feature from Redis."""
    feature_id = request.args.get("id")
    if not feature_id:
        logger.error("Feature ID not provided.")
        return jsonify({"error": "Feature ID not provided."}), 400
    feature = redis_client.get(feature_id)
    if not feature:
        logger.error(f"Feature not found: {feature_id}")
        return jsonify({"error": "Feature not found"}), 404
    logger.info(f"Feature retrieved with ID: {feature_id}")
    return feature


if __name__ == "__main__":
    serve(app, listen="*:8080")
