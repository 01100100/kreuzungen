import fetch from "cross-fetch";
import { createClient } from "redis";

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
  console.log("Getting Strava access token");
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

// Update the description of a Strava activity and return true if success
export async function updateStravaActivityDescription(
  activity_id: number,
  owner_access_token: string,
  description: string
): Promise<boolean> {
  console.log(activity_id)
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
    // log the response fully
    console.log(`response status: ${response.status}`);
    console.log(`response ok: ${response.ok}`);
    console.log(`response statusText: ${response.statusText}`);
    console.log(`response type: ${response.type}`);
    console.log(`response url: ${response.url}`);
    if (!response.ok) {
      console.log(`response status: ${response.status}`);
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
