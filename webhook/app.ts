import express from "express";
import bodyParser from "body-parser";
import { createClient } from "redis";
import { FeatureCollection, Feature, BBox } from "geojson";
import {
  getStravaAccessToken,
  getStravaActivity,
  updateStravaActivityDescription,
} from "./strava";
import { calculateIntersectingWaterways } from "./geo";

const app = express().use(bodyParser.json());

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

// Define a POST route for '/webhook' to receive and process incoming events
app.post("/webhook", async (req, res) => {
  console.log("webhook event received!", req.query, req.body);
  const event = req.body;

  if (event.aspect_type === "create" && event.object_type === "activity") {
    try {
      const activity_id = event.object_id;
      const owner_id = event.owner_id;
      const owner_access_token = await getStravaAccessToken(
        owner_id,
        redisClient
      );
      if (!owner_access_token) {
        console.error("No access token found for user_id: " + owner_id);
        res.status(200).send("EVENT_RECEIVED");
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
        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      // calculate intersecting waterways
      const intersectingWaterways = await calculateIntersectingWaterways(
        activityData.map.summary_polyline
      );
      if (!intersectingWaterways) {
        console.error("No intersecting waterways found");
        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      if (intersectingWaterways.length === 0) {
        console.log("No intersecting waterways found");
        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      intersectingWaterways.forEach((waterway) => {
        if ("features" in waterway) {
          if (waterway.features.length === 0) {
            console.log("No intersecting waterways found");
            res.status(200).send("EVENT_RECEIVED");
            return;
          }
        }
      });

      console.log("Intersecting waterways found");

      // create a message with the intersecting waterways
      const waterwaysMessage = createWaterwaysMessage(intersectingWaterways);

      // update the activity description with the waterways message if there are waterways
      await updateStravaActivityDescription(
        activity_id,
        owner_access_token,
        waterwaysMessage
      );
      console.log(`Activity ${activity_id} updated`);
    } catch (error) {
      console.error("Error updating activity description", error);
    }
  }
  res.status(200).send("EVENT_RECEIVED");
});

function createWaterwaysMessage(
  features: (Feature | FeatureCollection)[]
): string {
  const names: string[] = [];

  features.forEach((feature) => {
    let name: string;

    if (feature.type === "FeatureCollection") {
      name = feature.features[0]?.properties?.collectedProperties[0].name;
    } else {
      name = feature.properties?.name;
    }
    // only add the name is its not undefined
    if (name) {
      names.push(name);
    }
  });
  return `Crossed ${names.length} waterways 🏞️ ${names.join(
    " | "
  )} 🌐 https://kreuzungen.world 🗺️`;
}

// // combine all FeatureCollection features (which come from turf.combine )in a feature collection into a single feature
// function flattenFeatureCollectionFeatures(
//   featureCollection: FeatureCollection
// ): FeatureCollection {
//   const features = featureCollection.features;
//   // const combinedFeatures = features.map((feature) => {
//   //   if (feature.type === 'FeatureCollection') {
//   //     return (feature.features);
//   //   }
//   //   return feature;
//   // });
//   // return combinedFeatures;
//   return featureCollection;
// }
