import fetch from "cross-fetch";
import { createClient } from "redis";
import {
  doesStringContainWaterwaysMessage,
  removeWaterwaysMessage,
} from "./geo";
import { rest } from "lodash";

type RedisClientType = ReturnType<typeof createClient>;
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
    const response = await fetch("https://auth.kreuzungen.world/reoauth", {
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
export async function refreshStravaAccessToken(
  refreshToken: string
): Promise<string> {
  console.log("Refreshing Strava access token");
  try {
    const response = await fetch("https://auth.kreuzungen.world/reoauth", {
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

    // Save the refresh token in local storage
    localStorage.setItem("strava_data", JSON.stringify(data));
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
    const response = await fetch("https://auth.kreuzungen.world/oauth", {
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
): Promise<any[]> {
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
      // TODO: flash on screen and prompt to reauthenticate
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

// Check if a Strava activity has a description and append the waterway information to it.
export async function appendWaterwaysToStravaActivityDescription(
  activity_id: number,
  owner_access_token: string,
  waterways_summary: string
): Promise<boolean> {
  // Check if the activity has a description
  let description: string;
  try {
    const activity = await getStravaActivity(activity_id, owner_access_token);
    description = activity.description;
  } catch (error) {
    console.error(
      `Error getting Strava activity ${activity_id} description:`,
      error
    );
    return false;
  }
  // If it doesn't update with waterway information
  if (!description) {
    console.log("No description found for activity");
    return await updateStravaActivityDescription(
      activity_id,
      owner_access_token,
      waterways_summary
    );
  }
  else {
    if (doesStringContainWaterwaysMessage(description)) {
      // If it does, check if it already has waterway information
      const restOfDescription = removeWaterwaysMessage(description);
      if (restOfDescription === "") {
        // If there is no message in the description except the waterway information, update with new waterway information
        return await updateStravaActivityDescription(
          activity_id,
          owner_access_token,
          `${waterways_summary}`
        );
      } else {
        // If there is a message in the description, append new waterway information to message
        return await updateStravaActivityDescription(
          activity_id,
          owner_access_token,
          `${restOfDescription}\n\n${waterways_summary}`
        );
      }
    } else {
      // If the activity description does not have waterway info, simply append waterway information
      return await updateStravaActivityDescription(
        activity_id,
        owner_access_token,
        `${description}\n\n${waterways_summary}`
      );

    }
  }
}

// Update the description of a Strava activity and return true if success
export async function updateStravaActivityDescription(
  activity_id: number,
  owner_access_token: string,
  description: string
): Promise<boolean> {
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
      const errorMessage = await response.text();
      console.error(
        `Failed to update Strava activity https://www.strava.com/activities/${activity_id} description. Status: ${response.status}. Error: ${errorMessage}`
      );
      return false
    } else {
      return true
    }
  } catch (error) {
    console.error(
      `Error updating Strava activity ${activity_id} description:`,
      error
    );
  }
}

////////////////////////////////// the functions /////////////////////////////////////////////////////////////
