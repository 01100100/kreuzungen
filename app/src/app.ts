import express from "express";
import bodyParser from "body-parser";
import { createClient } from "redis";
import umami from '@umami/node';

import {
  getStravaAccessTokenRedis,
  getStravaActivity,
  updateStravaActivityDescription,
} from "./strava";
import { calculateIntersectingWaterwaysPolyline, checkForCompletedCities, createWaterwaysMessage } from "./geo";

const app = express().use(bodyParser.json());

umami.init({
  websiteId: process.env.UMAMI_WEBSITE_ID,
  hostUrl: process.env.STATS_HOST_URL,
});
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (error) => {
  console.error(`Redis client error:`, error);
});

// The main asynchronous function
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

// Run the async function
main();

// Define a GET route for '/webhook' to verify the webhook subscription with Strava
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "STRAVA";

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

// route for '/webhook' to receive and process incoming events
// must acknowledge each new event with a status code of 200 OK within two seconds.
// Event pushes are retried (up to a total of three attempts) if a 200 is not returned. If your application needs to do more processing of the received information, it should do so asynchronously.
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
  // const resp = await umami.track("webhook-strava-event-received", {
  //   aspect_type: event.aspect_type,
  //   object_type: event.object_type,
  //   owner_id: event.owner_id,
  //   object_id: event.object_id,
  // });
  // if (!resp.ok) {
  //   console.error("Failed to track event", resp.status, resp.statusText);
  // }
  // // log the request for tracking debugging
  // console.log("umami response", resp);

});

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

    // check that the activity has a summary polyline
    if (!activityData.map || !activityData.map.summary_polyline) {
      console.error(
        "Activity does not have a summary polyline:",
        activityData
      );
      return;
    }

    // calculate intersecting waterways
    const intersectingWaterways = await calculateIntersectingWaterwaysPolyline(
      activityData.map.summary_polyline
    );

    if (intersectingWaterways.features.length === 0) {
      console.log("No intersecting waterways found");
      return;
    }

    console.log(`${intersectingWaterways.features.length} intersecting waterways found`);

    // create a message with the intersecting waterways
    const waterwaysMessage = createWaterwaysMessage(intersectingWaterways);

    // update the activity description with the waterways message if there are waterways
    const success = await updateStravaActivityDescription(
      activity_id,
      owner_access_token,
      waterwaysMessage
    );
    if (success) {
      // track update
      // track("webhook-strava-activity-update", {
      //   athlete: owner_id,
      //   activity: activity_id,
      //   waterways: intersectingWaterways.features.length
      // });
      console.log(`Updated activity https://www.strava.com/activities/${activity_id} with ${waterwaysMessage}`)
    } else {
      //track failed update
      // track("webhook-strava-activity-update-failed", {
      //   athlete: owner_id,
      //   activity: activity_id,
      // });
      console.error(`Failed to update activity description for activity_id: ${activity_id}`);
    }
    checkForCompletedCities(intersectingWaterways, activityData.map.summary_polyline);
    

  } catch (error) {
    console.error("Error updating activity description", error);
  }
}

async function deleteUser(owner_id) {
  try {
    await redisClient.del(owner_id.toString());
    // track("webhook-strava-athlete-unauthorize", {
    //   athlete: owner_id,
    // });
    console.log(`Deleted access token for user_id: ${owner_id}`);
  } catch (error) {
    console.error("Error deleting access token", error);
  }
}

async function track(name: string, data: any) {
  const payload = {
    hostname: "kreuzungen.world",
    language: "en-US",
    referrer: "",
    screen: "",
    title: "webhook",
    url: "/",
    website: process.env.UMAMI_WEBSITE_ID,
    name: name,
    data: data,
  };

  const response = await fetch(`${process.env.STATS_HOST_URL}/api/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payload,
      type: "event",
    }),
  });

  if (!response.ok) {
    console.error("Failed to track event", response.status, response.statusText);
  }
}