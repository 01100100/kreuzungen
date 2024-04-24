import fetch from "cross-fetch";
import { feature } from "@turf/helpers";
import { processGeojson } from "./main";
import { createClient } from "redis";
type RedisClientType = ReturnType<typeof createClient>;
import polyline from "@mapbox/polyline";

// Get a Strava refresh token for a user stored in redis
export async function getStravaRefreshToken(
  user_id: number,
  redisClient: RedisClientType
): Promise<string> {
  try {
    const refreshToken = await redisClient.get(user_id.toString());
    if (!refreshToken) {
      console.error("No refresh token found for user_id:", user_id);
      throw new Error(`No refresh token found for user_id: ${user_id}`);
    }
    return refreshToken;
  } catch (error) {
    console.error("Error getting refresh token from Redis:", error);
    throw new Error("Failed to get Strava refresh token");
  }
}
interface TokenResponse {
  access_token: string;
}

// Get a new Strava access token for a user from a refresh token stored in redis
export async function getStravaAccessTokenRedis(
  user_id: number,
  redisClient: RedisClientType
): Promise<string> {
  try {
    const refreshToken = await getStravaRefreshToken(user_id, redisClient);
    const response = await fetch("https://kreuzungen.fly.dev/reoauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `refreshToken=${refreshToken}`,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to get Strava access token. Status: ${response.status}`
      );
    }
    const data = (await response.json()) as TokenResponse;
    return data.access_token;
  } catch (error) {
    console.error("Error getting Strava access token:", error);
    throw new Error("Failed to get Strava access token");
  }
}
// Get a new Strava access token for a user from a refresh token
export async function getStravaAccessToken(
  refreshToken: string
): Promise<string> {
  try {
    const response = await fetch("https://kreuzungen.fly.dev/reoauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `refreshToken=${refreshToken}`,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to get Strava access token. Status: ${response.status}`
      );
    }
    const data = (await response.json()) as TokenResponse;
    return data.access_token;
  } catch (error) {
    console.error("Error getting Strava access token:", error);
    throw new Error("Failed to get Strava access token");
  }
}

// Get and store a new Strava access token for a user
export async function getAndStoreStravaAccessToken(
  oauth_code: string
): Promise<string> {
  try {
    const response = await fetch("https://kreuzungen.fly.dev/oauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `code=${oauth_code}`,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to get Strava access token. Status: ${response.status}`
      );
    }
    const data = (await response.json()) as TokenResponse;

    // Save the refresh token in local storage
    localStorage.setItem("strava_data", JSON.stringify(data));
    return data.access_token;
  } catch (error) {
    console.error("Error getting Strava access token:", error);
    throw new Error("Failed to get Strava access token");
  }
}

// Get data for a Strava activity
export async function getStravaActivity(
  activity_id: number,
  owner_access_token: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activity_id}`,
      {
        headers: {
          Authorization: `Bearer ${owner_access_token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to get Strava activity ${activity_id} data. Status: ${response.status}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting Strava activity ${activity_id} data:`, error);
    throw new Error(`Failed to get Strava activity ${activity_id} data`);
  }
}

// Get data for last 200 Strava activities with coordinates
export async function getStravaActivities(
  owner_access_token: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities?per_page=200`,
      {
        headers: { Authorization: `Bearer ${owner_access_token}` },
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to get Strava activities. Status: ${response.status}`
      );
    } else {
      const data = await response.json();
      // filter out the activities that do not have coordinates
      const stravaActivities = [].concat(data).filter(function (x) {
        return x.map.summary_polyline && x.map.summary_polyline.length > 0;
      });

      return stravaActivities;
    }
  } catch (error) {
    console.error("Error getting Strava activities:", error);
    throw new Error("Failed to get Strava activities");
  }
}

// Update the description of a Strava activity
export async function updateStravaActivityDescription(
  activity_id: number,
  owner_access_token: string,
  description: string
) {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activity_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${owner_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description,
        }),
      }
    );
    if (!response.ok) {
      let errorMessage = "";
      try {
        const errorResponse = (await response.json()) as any;
        errorMessage = errorResponse.message;
      } catch {
        errorMessage = "Unknown error occurred";
      }
      throw new Error(
        `Failed to update Strava activity ${activity_id} description. Status: ${response.status}. Error: ${errorMessage}`
      );
    } else {
      console.log(`Updated Strava activity ${activity_id} description`);
    }
  } catch (error) {
    console.error(
      `Error updating Strava activity ${activity_id} description:`,
      error
    );
    throw new Error(
      `Failed to update Strava activity ${activity_id} description`
    );
  }
}

////////////////////////////////// the functions /////////////////////////////////////////////////////////////
function displayActivities(activities: any[]) {
  const activitiesPerPage = 5;
  const startIndex = 0;
  const currentPageActivities = activities.slice(
    startIndex,
    startIndex + activitiesPerPage
  );
  const activitiesList = document.getElementById("activitiesList");
  activitiesList.style.width = "250px";
  activitiesList.innerHTML = "";

  currentPageActivities.forEach(function (activity) {
    const activityElement = createActivityElement(activity);
    activityElement.addEventListener("click", function () {
      loadActivityOnMap(activity);
    });
    activitiesList.appendChild(activityElement);
  });

  activitiesList.style.cursor = "pointer";

  if (activities.length > startIndex + activitiesPerPage) {
    const nextLink = document.createElement("a");
    nextLink.innerHTML = '<i class="fa-solid fa-circle-right"></i>';
    nextLink.style.float = "right";
    nextLink.addEventListener("click", function () {
      displayActivities(activities.slice(startIndex + activitiesPerPage));
    });
    activitiesList.appendChild(nextLink);
  }
}

function createActivityElement(activity) {
  const activityElement = document.createElement("div");
  activityElement.className =
    "text-white bg-gradient-to-r from-pink-500 to-orange-400 hover:bg-gradient-to-l focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 px-1 py-1";
  activityElement.style.display = "flex";
  activityElement.style.flexDirection = "column";
  activityElement.style.marginBottom = "3px";
  activityElement.style.borderRadius = "3px";
  const nameElement = document.createElement("div");
  nameElement.innerHTML = activity.name;
  nameElement.style.fontWeight = "bold";
  nameElement.style.whiteSpace = "nowrap";
  nameElement.style.overflow = "hidden";
  nameElement.style.textOverflow = "ellipsis";
  nameElement.style.maxWidth = "100%";
  activityElement.appendChild(nameElement);

  const detailsElement = document.createElement("div");
  detailsElement.style.display = "flex";
  detailsElement.style.justifyContent = "space-between";
  activityElement.appendChild(detailsElement);

  const distanceElement = document.createElement("div");
  distanceElement.innerHTML = (activity.distance / 1000).toFixed(2) + " km";
  detailsElement.appendChild(distanceElement);

  const dateElement = document.createElement("div");
  const date = new Date(activity.start_date);
  const formattedDate = date.toISOString().split("T")[0];
  dateElement.innerHTML = formattedDate;
  detailsElement.appendChild(dateElement);

  return activityElement;
}

function loadActivityOnMap(activity) {
  const activitiesContainer = document.getElementById("activities");
  if (activitiesContainer) {
    activitiesContainer.style.display = "none";
  }
  const geojson = feature(polyline.toGeoJSON(activity.map.summary_polyline));
  geojson.properties = {
    name: activity.name,
    url: `https://www.strava.com/activities/${activity.id}`,
  };
  processGeojson(geojson);
}

export async function loadStravaActivities(owner_access_token: string) {
  // show loading spinner
  const infoElement = document.getElementById("activitiesList");

  const spinnerContainer = document.getElementById("spinner");
  if (!spinnerContainer) {
    const spinnerElement = document.createElement("div");
    spinnerElement.id = "spinner";
    spinnerElement.style.textAlign = "center";
    spinnerElement.innerHTML =
      '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>';
    infoElement.appendChild(spinnerElement);
  }

  // get activities
  let activities = await getStravaActivities(owner_access_token);
  displayActivities(activities);
}
