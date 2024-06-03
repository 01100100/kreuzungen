import express from "express";
import bodyParser from "body-parser";
import { createClient } from "redis";

import {
  getStravaAccessTokenRedis,
  getStravaActivity,
  updateStravaActivityDescription,
} from "./strava";
import { calculateIntersectingWaterwaysPolyline, createWaterwaysMessage } from "./geo";

// Create a new express application and redis client
const app = express().use(bodyParser.json());
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (error) => {
  console.error(`Redis client error:`, error);
});
main();

// Connect to redis and start the express server
async function main() {
  try {
    await redisClient.connect();
    app.listen(process.env.PORT || 80, () =>
      console.log("webhook is listening")
    );
  } catch (error) {
    console.error("Error connecting to Redis:", error);
  }
}

// GET route for '/webhook' to verify the webhook subscription with Strava
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.json({ "hub.challenge": challenge });
    } else {
      res.sendStatus(403);
    }
  }
});

// Post route for '/webhook' to receive and process incoming events
// Strava requires an acknowledgement (200 response) for each new event within two seconds.
// Event pushes are retried (up to a total of three attempts) if a 200 is not returned. Any processing should therefor be done asynchronously.
app.post("/webhook", async (req, res) => {
  console.log("webhook event received!", req.query, req.body);
  const event = req.body;
  // return a aknoledgment and process the event asynchronously
  res.status(200).send("EVENT_RECEIVED");
  if (event.aspect_type === "create" && event.object_type === "activity") {
    // update the activity description with intersecting waterways
    processAndUpdateStrava(event.owner_id, event.object_id);
  }
  else if (event.aspect_type === "update" && event.object_type === "athlete" && event.updates && event.updates.authorized === "false") {
    deleteUser(event.owner_id)
  }
});

// Calcluate intersecting waterways for a Strava activity and update the activity description
// NOTE: Uses map.summary_polyline instead of map.polyline to respect the users privacy settings
// it is normal for users to "hide" the route within a small radius of their home or work
// hence waterways will only be calculated for the "unhidden" part of the route represented by the summary_polyline
// https://communityhub.strava.com/t5/strava-insider-journal/hiding-your-activity-map-from-others/ba-p/17755
async function processAndUpdateStrava(owner_id, activity_id,) {
  try {
    const owner_access_token = await getStravaAccessTokenRedis(
      owner_id,
      redisClient
    );
    if (!owner_access_token) {
      console.error("No access token found for user_id: " + owner_id);
      return;
    }
    const activityData = await getStravaActivity(
      activity_id,
      owner_access_token
    );

    console.log(`Processing activity_id: ${activity_id}`);

    // check that the activity has a summary polyline
    if (!activityData.map || !activityData.map.summary_polyline) {
      console.error(
        `Activity ${activity_id} does not have a summary polyline`
      );
      return;
    }

    // calculate intersecting waterways
    const intersectingWaterways = await calculateIntersectingWaterwaysPolyline(
      activityData.map.summary_polyline
    );

    // check if there are intersecting waterways
    if (intersectingWaterways.features.length === 0) {
      console.log("No intersecting waterways found");
      return;
    }

    console.log(`${intersectingWaterways.features.length} intersecting waterways found for activity_id: ${activity_id}`);

    // update the activity description with the waterways
    const waterwaysMessage = createWaterwaysMessage(intersectingWaterways);
    const success = await updateStravaActivityDescription(
      activity_id,
      owner_access_token,
      waterwaysMessage
    );
    if (success) {
      console.log(`Updated activity https://www.strava.com/activities/${activity_id} with ${waterwaysMessage}`)
    } else {
      console.error(`Failed to update activity https://www.strava.com/activities/${activity_id}`);
    }
  } catch (error) {
    console.error(`Error updating activity ${activity_id} description`, error);
  }
}

// Delete the access token for a user
async function deleteUser(owner_id) {
  try {
    await redisClient.del(owner_id.toString());
    console.log(`Deleted access token for user_id: ${owner_id}`);
  } catch (error) {
    console.error("Error deleting access token", error);
  }
}
