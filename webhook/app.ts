import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { createClient } from 'redis';
import polyline from '@mapbox/polyline';
import { bbox, area, bboxPolygon, booleanIntersects, combine, featureCollection as makeFeatureCollection, featureCollection, multiLineString } from '@turf/turf';
import osmtogeojson from 'osmtogeojson';
import { DOMParser } from 'xmldom';
import { groupBy } from 'lodash';
import { FeatureCollection, Geometry, GeoJsonProperties, Feature, LineString, BBox } from 'geojson';
import { getStravaAccessToken, getStravaActivity, updateStravaActivityDescription } from './strava'

const app = express().use(bodyParser.json());

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', error => {
  console.error(`Redis client error:`, error);
});

// Define Constants
const bboxSizeLimit_m2 = 500000000; // maximum size limit for a bounding box in square meters

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

      // calculate intersecting waterways
      const intersectingWaterways = await calculateIntersectingWaterways(activityData.map.summary_polyline);
      if (!intersectingWaterways) {
        console.error('No intersecting waterways found');
        res.status(200).send('EVENT_RECEIVED');
        return;
      }

      // create a message with the intersecting waterways
      const waterwaysMessage = createWaterwaysMessage(intersectingWaterways);
      console.log(waterwaysMessage);
      // update the activity description with the waterways message
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

async function calculateIntersectingWaterways(polylineString: string): Promise<(Feature | FeatureCollection)[] | undefined> {
  try {
    const geojson: LineString = polyline.toGeoJSON(polylineString);
    const routeBoundingBox: BBox = bbox(geojson);
    const waterwaysQuery = fetchWaterwaysQuery(routeBoundingBox);
    const osmData = await fetchOverpassData(waterwaysQuery);
    if (!osmData) {
      console.error(`No osm features returned for Overpass query: ${waterwaysQuery}`);
      return;
    }
    const waterwaysGeoJSON = parseOSMToGeoJSON(osmData);
    const combined = combineSameNameFeatures(waterwaysGeoJSON)
    console.log(combined)
    const intersectingWaterways = filterIntersectingWaterways(
      combined,
      geojson
    )
    return intersectingWaterways;
  } catch (error) {
    console.error('Error processing GeoJSON:', error);
    return;
  }
}

function fetchWaterwaysQuery(bbox: BBox): string {
  let waterwaysQuery = `(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;
  if (area(bboxPolygon(bbox)) > bboxSizeLimit_m2) {
    console.log(
      "The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways) from the OSM overpass api."
    );
    console.log(
      `${area(bboxPolygon(bbox))} m**2 > ${bboxSizeLimit_m2}`
    );
    waterwaysQuery = `rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`;
  }
  return waterwaysQuery

}
async function fetchOverpassData(waterwaysQuery: string): Promise<string> {
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

function parseOSMToGeoJSON(osmData: string): FeatureCollection<Geometry, GeoJsonProperties> {
  const dom = new DOMParser().parseFromString(osmData, "text/xml");
  return osmtogeojson(dom);
}

function filterIntersectingWaterways(waterwaysGeoJSON: FeatureCollection, routeGeoJSON: any): Feature[] {
  return waterwaysGeoJSON.features.filter((feature) =>
    booleanIntersects(feature, routeGeoJSON)
  );
}

function combineSameNameFeatures(osmData: FeatureCollection<Geometry, GeoJsonProperties>): FeatureCollection<Geometry, GeoJsonProperties> {
  const groupedFeatures: object = groupBy(osmData.features, (feature: Feature) => feature.properties && feature.properties.name);
  const combinedFeatures: Feature[] = Object.values(groupedFeatures).map((group) => {
    if (group.length > 1) {
      return combine(featureCollection(group));
    }
    return group[0];
  });

  return featureCollection(combinedFeatures);
}

function createWaterwaysMessage(features: (Feature | FeatureCollection)[]): string {
  const names: string[] = [];

  features.forEach(feature => {
    let name: string;

    if (feature.type === 'FeatureCollection') {
      name = feature.features[0]?.properties?.collectedProperties[0].name
    } else {
      name = feature.properties?.name
    }
    // only add the name is its not undefined
    if (name) {
      names.push(name)
    }
  });
  return `Crossed ${names.length} waterways 🏞️ ${names.join(' | ')} 🌐 https://kreuzungen.world 🗺️`
}
