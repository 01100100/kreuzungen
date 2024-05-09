import polyline from "@mapbox/polyline";
import { processGeojson, mapInstance, loadWaterwaysForArea, loadMainWaterwaysForArea } from "./main";
import {
  getAndStoreStravaAccessToken,
  getStravaAccessToken,
} from "./strava";
import { flashMessage, loadStravaActivities } from "./ui";
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

  // check if the url contains a area name and process it
  if (urlParams.has("showAll")) {
    const areaName = urlParams.get("showAll");
    console.log("loading area with name: ", areaName);
    if (mapInstance.isStyleLoaded()) {
      loadWaterwaysForArea(areaName)
    } else {
      mapInstance.once("style.load", () => {
        loadWaterwaysForArea(areaName);
      });
    }
  }

  // check if the url contains a area name and process it
  if (urlParams.has("showMain")) {
    const areaName = urlParams.get("showMain");
    console.log("loading area with name: ", areaName);
    if (mapInstance.isStyleLoaded()) {
      loadMainWaterwaysForArea(areaName)
    } else {
      mapInstance.once("style.load", () => {
        loadMainWaterwaysForArea(areaName);
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
  if (urlParams.has("scope")) {
    // User has been redirected from strava oauth
    const approvedScopes = urlParams.get("scope");
    const requiredScopes = ["activity", "activity:read_all"];
    const hasRequiredScopes = approvedScopes !== null && requiredScopes.some((scope) =>
      approvedScopes.includes(scope)
    );

    if (hasRequiredScopes) {
      // Check if the activity:write scope is set and if not flash a message on the screen
      const hasWriteScope = approvedScopes.includes("activity:write");
      if (!hasWriteScope) {
        flashMessage(
          'You have not granted Strava "Write" permissions to Kreuzungen.<br><p>Grant the permissions and enable Kreuzungen to Automagically update newly created Strava activities.</p><hr><p style="">Crossed 5 waterways 🏞️ Nile | Amazon River | Mississippi River | Danube River | Ganges | River Thames 🌐 <a href="https://kreuzungen.world">https://kreuzungen.world</a> 🗺️</p>'
        );
      }
      const code = urlParams.get("code");
      const accessToken = await getAndStoreStravaAccessToken(code);
      loadStravaActivities(accessToken);
    } else {
      flashMessage(
        'To Sync with strava, you need to authorize Kreuzungen it to read your activity data. Please authenticate again and check the box for "View data about your activities".'
      );
      document.getElementById("stravaConnect").style.display = "flex";
      document.getElementById("stravaPowered").style.display = "none";
    }
  }
  else if (token_exists && new Date().getTime() / 1000 < expires_at) {
    console.log("token exists and hasn't expired");
    // Access token is saved in local storage and hasn't expired yet
    const token = JSON.parse(localStorage.getItem("strava_data")).access_token;
    // load the activities
    const activities = await loadStravaActivities(token);
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
    console.log("Something went wrong, opps.")

  }
}
