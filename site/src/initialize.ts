import polyline from "@mapbox/polyline";
import { processGeojson, mapInstance } from "./main";
import {
  getAndStoreStravaAccessToken,
  getStravaAccessToken,
} from "./strava";
import { loadStravaActivities } from "./ui";
import { feature } from "@turf/turf";
import { getSavedRoute } from "./stash";

export async function setUp() {
  const urlParams = new URLSearchParams(window.location.search);
  // check if the url contains a route and load it
  if (urlParams.has("route")) {
    const route = urlParams.get("route");
    let geojson = feature(polyline.toGeoJSON(route));

    geojson.properties = { name: "✨ Route shared with magic link ✨" };

    // Ensure the map style is loaded before processing the route.
    if (mapInstance.isStyleLoaded()) {
      processGeojson(geojson);
    } else {
      mapInstance.once("style.load", () => {
        processGeojson(geojson);
      });
    }
  }

  // check if the url contains a saved id and load it from the backend
  if (urlParams.has("saved")) {
    const savedId = urlParams.get("saved");
    if (savedId) {
      console.log("loading saved route with id: ", savedId);
      const savedGeojson = await getSavedRoute(savedId)
      processGeojson(savedGeojson);
    }
  }

  // check local storage for a possible access token
  let token_exists = false;
  let expires_at: any = 0;
  try {
    const stravaData = JSON.parse(localStorage.getItem("strava_data"));
    token_exists = true;
    expires_at = stravaData.expires_at;
  } catch {
    token_exists = false;
    expires_at = 0;
  }
  // Handle different scenarios based on token existence and expiration
  if (token_exists && new Date().getTime() / 1000 < expires_at) {

    console.log("token exists and hasn't expired");
    // Access token is saved in local storage and hasn't expired yet
    const token = JSON.parse(localStorage.getItem("strava_data")).access_token;
    // load the activities
    const activities = await loadStravaActivities(token);

    // add callbacks to process the geojson


    loadStravaActivities(token);
  } else if (token_exists && new Date().getTime() / 1000 >= expires_at) {
    // Access token is saved in local storage but expired
    console.log("Token exists but has expired");
    const refreshToken = JSON.parse(
      localStorage.getItem("strava_data")
    ).refresh_token;
    let newAccessToken = await getStravaAccessToken(refreshToken);
    loadStravaActivities(newAccessToken);
  } else if (
    !urlParams.has("exchange_token") ||
    urlParams.get("error") === "access_denied"
  ) {
    // No token in local storage, no authorization code
    document.getElementById("stravaConnect").style.display = "flex";
    document.getElementById("stravaPowered").style.display = "none";
  } else {
    // Authorization code retrieved
    const approvedScopes = urlParams.get("scope");
    const requiredScopes = ["activity", "activity:read_all"];
    const hasRequiredScopes = requiredScopes.some((scope) =>
      approvedScopes.includes(scope)
    );

    if (hasRequiredScopes) {
      const code = urlParams.get("code");
      const accessToken = await getAndStoreStravaAccessToken(code);
      loadStravaActivities(accessToken);
    } else {
      alert(
        "For this app to work with strava, you need to authorize it to view activity data. Please authenticate again and authorize the app."
      );
      document.getElementById("stravaConnect").style.display = "flex";
      document.getElementById("stravaPowered").style.display = "none";
    }
  }
}
