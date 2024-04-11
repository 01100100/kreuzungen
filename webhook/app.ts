import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { createClient } from 'redis';
import polyline from '@mapbox/polyline';
import * as turf from '@turf/turf';
import osmtogeojson from 'osmtogeojson';
import { DOMParser } from 'xmldom';
import { FeatureCollection, Geometry, GeoJsonProperties, Feature } from 'geojson';
import { getStravaAccessToken, getStravaActivity, updateStravaActivityDescription } from './strava'

const app = express().use(bodyParser.json());

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', error => {
  console.error(`Redis client error:`, error);
});

// Define Constants
const bboxSizeLimit_m2 = 500000000; // maximum size limit for a bounding box in square meters

// Initialize variables
let isBigBbox: boolean | null = null;

// The main asynchronous function 
async function main() {
  try {
    await redisClient.connect();
    app.listen(process.env.PORT || 80, () => console.log('webhook is listening'));
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
}

// Run the async function
main()

// Define a POST route for '/webhook' to receive and process incoming events
app.post('/webhook', async (req, res) => {
  console.log("webhook event received!", req.query, req.body);
  const event = req.body;

  if (event.aspect_type === 'create' && event.object_type === 'activity') {
    try {
      const activity_id = event.object_id;
      const owner_id = event.owner_id;
      const owner_access_token = await getStravaAccessToken(owner_id, redisClient);
      if (!owner_access_token) {
        console.error('No access token found for user_id: ' + owner_id);
        res.status(200).send('EVENT_RECEIVED');
        return;
      }
      const activityData = await getStravaActivity(activity_id, owner_access_token);

      // check that the activity has a summary polyline
      if (!activityData.map || !activityData.map.summary_polyline) {
        console.error('Activity does not have a summary polyline:', activityData);
        res.status(200).send('EVENT_RECEIVED');
        return;
      }


      const geojson = polyline.toGeoJSON(activityData.map.summary_polyline);

      const intersectingWaterways = await processGeojson(geojson);
      console.log(intersectingWaterways)
      const waterwaysMessage = createWaterwaysMessage(intersectingWaterways as Feature<Geometry, GeoJsonProperties>[]);
      await updateStravaActivityDescription(activity_id, owner_access_token, waterwaysMessage);
      console.log(`Activity ${activity_id} updated`);
    } catch (error) {
      console.error('Error updating activity description', error);
    }
  }
  res.status(200).send('EVENT_RECEIVED');
});

// Define a GET route for '/webhook' to verify the webhook subscription with Strava
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "STRAVA";

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.json({ "hub.challenge": challenge });
    } else {
      res.sendStatus(403);
    }
  }
});

// Process a GeoJSON to find intersecting waterways
async function processGeojson(routeGeoJSON: any) {
  const routeBoundingBox = turf.bbox(routeGeoJSON);
  isBigBbox = turf.area(turf.bboxPolygon(routeBoundingBox)) > bboxSizeLimit_m2;
  const waterwaysData = await fetchWaterways(routeBoundingBox);
  if (!waterwaysData) {
    console.error('No waterways data found');
    return;
  }
  const waterwaysGeoJSON = parseOSMToGeoJSON(waterwaysData);
  console.log(waterwaysGeoJSON)
  let intersectingWaterways = {};
  if (!isBigBbox) {
    intersectingWaterways = filterIntersectingWaterways(
      combineGeometriesForFeaturesWithTheSameName(waterwaysGeoJSON),
      routeGeoJSON
    );
  } else {
    intersectingWaterways = filterIntersectingWaterways(
      waterwaysGeoJSON,
      routeGeoJSON
    );
  }

  return intersectingWaterways;
}

async function fetchWaterways(bbox: any): Promise<string | undefined> {
  let waterwaysQuery = `(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;
  if (isBigBbox) {
    console.log(
      "The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways) from the OSM overpass api."
    );
    console.log(
      `${turf.area(turf.bboxPolygon(bbox))} m**2 > ${bboxSizeLimit_m2}`
    );
    waterwaysQuery = `rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`;
    const response = await fetch(
      "https://www.overpass-api.de/api/interpreter?",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: waterwaysQuery,
      }
    );
    if (response.ok) {
      const text = await response.text();
      return text;
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}

function parseOSMToGeoJSON(osmData: string): FeatureCollection<Geometry, GeoJsonProperties> {
  const dom = new DOMParser().parseFromString(osmData, "text/xml");
  return osmtogeojson(dom);
}

function filterIntersectingWaterways(waterwaysGeoJSON: FeatureCollection, routeGeoJSON: any): GeoJSON.Feature[] {
  return waterwaysGeoJSON.features.filter((feature) =>
    turf.booleanIntersects(feature, routeGeoJSON)
  );
}

function combineGeometriesForFeaturesWithTheSameName(featureCollection: FeatureCollection<Geometry, GeoJsonProperties>) {
  const uniqueFeatures: any = {};

  featureCollection.features.forEach((feature) => {
    if (feature.properties && feature.properties.name) {
      const name = feature.properties.name;
      if (!uniqueFeatures[name]) {
        uniqueFeatures[name] = [];
      }
      uniqueFeatures[name].push(feature);
    }
  });

  const featuresArray = Object.entries(uniqueFeatures).map(([name, features]) => {
    if (Array.isArray(features) && features.length === 1) {
      return features[0];
    } else {

      if (Array.isArray(features)) {
        const combinedGeometry = turf.combine(turf.featureCollection(features));
        const collectedProperties = [...new Set(features.map(f => f.properties))];
        const relationProperties = collectedProperties.find(prop => prop.id && prop.id.startsWith("relation/")) || {};

        // Create a combined feature with properties from the 'relation/' where applicable
        const combinedFeature = {
          type: "Feature",
          properties: {
            ...relationProperties,
            id: `combined/${collectedProperties.map(prop => prop.id.replace("way/", "")).join("_")}`,
            name: name
          },
          geometry: combinedGeometry.features[0].geometry
        };

        return combinedFeature;
      }
    }
  });

  return turf.featureCollection(featuresArray);
}

function createWaterwaysMessage(features: Feature[]): string {
  let waterwaysMessage = '';
  features.forEach((feature) => {
    if (feature.properties && feature.properties.name) {
      waterwaysMessage += `🏞️ ${feature.properties.name}, `;
    }
  });
  waterwaysMessage += `| 🌐 https://kreuzungen.world 🗺️`;
  return waterwaysMessage;
}