import { bbox } from "@turf/bbox";
import { combine } from "@turf/combine";
import { length } from "@turf/length";
import { lineIntersect } from "@turf/line-intersect";
import { lineSlice } from "@turf/line-slice";
import { feature, point, featureCollection } from "@turf/helpers";
import { booleanIntersects } from "@turf/boolean-intersects";
import osmtogeojson from "osmtogeojson";
import { groupBy } from "lodash";
import {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  Feature,
  LineString,
  BBox,
  MultiLineString,
  Point
} from "geojson";
import polyline from "@mapbox/polyline";
import toGeoJSON from "@mapbox/togeojson";
import { fetchOverpassData, waterwaysInBboxQuery, waterwaysInAreaQuery, waterwaysRelationsInAreaQuery, citiesInBboxQuery, waterwaysRelationsInBboxQuery, waterwaysWaysInBboxQuery } from "./overpass";

const waterwaysMessageRegex = /\n*Crossed \d+ waterways? 🏞️.*🌐 Powered by Kreuzungen World 🗺️.*\n*/;

export async function calculateIntersectingWaterwaysPolyline(polylineString: string): Promise<FeatureCollection | undefined> {
  const geojson = feature(polyline.toGeoJSON(polylineString));
  return calculateAllIntersectingWaterways(geojson);
}


export async function checkForCompletedCities(intersectingWaterways: FeatureCollection, routeGeoJSON: Feature<LineString>) {
  // Get all city and town area ids that the route intersects
  const cityIds = await getCityAdTownAreaIds(routeGeoJSON)

  // Then get all waterways for each of the cities
  const waterways = await Promise.all(cityIds.map((cityId) => getWaterwaysForArea(cityId.toString())))

  // then check for each city, if every waterway in the city is also in intersectingWaterways
  const completedCities = waterways.map((waterwaysForCity, index) => {
    const intersectingWaterwaysForCity = intersectingFeatures(waterwaysForCity as FeatureCollection<LineString | MultiLineString, { [name: string]: any; }>, routeGeoJSON)
    if (waterwaysForCity.features.length === intersectingWaterwaysForCity.features.length) {
      return cityIds[index]
    }
    return null
  }).filter((cityId) => cityId !== null) as number[]

  // if so, mark the city as completed
  console.log(completedCities)

  // update the hall of fame
  // TODO:

  // update the activity description with the completed cities and a crown and city emoji
}


export async function calculateAllIntersectingWaterways(
  routeGeoJSON: Feature<LineString>
): Promise<FeatureCollection | undefined> {
  // this works in 3 parts, to accommodate the OSM data model.
  // First it calculates at which relations have bee intersected
  // Second it calculates at all the named ways that has been intersected
  // Third it joins up the named ways, making a sort of synthetic relation for each of the waterways
  // It returns both a array of ways crossed and relations which are made up of these ways and the rest of the combined waterways.
  const crossedRelations = await calculateIntersectingWaterwayRelations(routeGeoJSON)
  // log number of crossed relations
  console.log(`crossed ${crossedRelations.features.length} OSM relations`)
  console.log(crossedRelations)
  const surroundingWaterways = await calculateSurroundingWays(routeGeoJSON)
  const crossedWays = await calculateIntersectingWaterwayWays(routeGeoJSON)
  console.log(`crossed ${crossedWays.features.length} OSM ways`)
  let syntheticRelations: Feature[] = []
  // for the crossed ways, we want to create a synthetic relation. A synthetic relation is a multilineString made up of the ways that share the same name.
  for (const way of crossedWays.features) {
    const name = way.properties.name
    const waysWithSameName = surroundingWaterways.features.filter((feature) => feature.properties.name === name)
    const combinedFeatureCollection = combine(featureCollection(waysWithSameName as Feature<LineString | MultiLineString>[]));
    syntheticRelations.push(...combinedFeatureCollection.features);
  }
  const syntheticRelationsFeatureCollection = featureCollection(syntheticRelations)
  console.log(`syntheticRelations ${syntheticRelationsFeatureCollection.features.length} relations crossed`)
  console.log(syntheticRelationsFeatureCollection)
  // then we mix the featureCollections together
  // first we must get the synthetic relations that are not already in the crossedRelations and set the id to be syntheticRelation/{id} where id is a incremental number
  const newRelations = syntheticRelationsFeatureCollection.features.filter((syntheticRelation) => {
    // add the id and set it the the index of the array
    syntheticRelation.id = `syntheticRelation/${syntheticRelationsFeatureCollection.features.indexOf(syntheticRelation)}`
    syntheticRelation.properties.name = syntheticRelation.properties.collectedProperties[0].name
    syntheticRelation.properties.id = syntheticRelation.id
    return !crossedRelations.features.some((crossedRelation) => crossedRelation.properties.name === syntheticRelation.properties.collectedProperties[0].name)
  })
  console.log(`newRelations ${newRelations.length} relations that are not on OSM`)
  console.log(newRelations)
  const allRelations = crossedRelations.features.concat(newRelations)
  console.log(`allRelations crossed in total is ${allRelations.length} relations`)
  
  const allRelationsFeatureCollection = featureCollection(allRelations)
  return featureCollection(allRelations)
}

export async function calculateIntersectingWaterwayRelations(
  routeGeoJSON: Feature<LineString>): Promise<FeatureCollection | undefined> {
  const routeBoundingBox: BBox = bbox(routeGeoJSON);
  const query = waterwaysRelationsInBboxQuery(routeBoundingBox);
  const osmData = await fetchOverpassData(query);
  if (!osmData) {
    console.error(
      `No osm features returned for Overpass query: ${query}`
    );
    return;
  }
  const relationsGeoJSON = parseOSMToGeoJSON(osmData);
  const lineStringFeatures = relationsGeoJSON.features.filter(
    (feature) => feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString"
  ) as Feature<LineString | MultiLineString>[];
  const intersectingWaterways = intersectingFeatures(
    featureCollection(lineStringFeatures),
    routeGeoJSON
  );
  return intersectingWaterways;
}


export async function calculateIntersectingWaterwayWays(
  routeGeoJSON: Feature<LineString>): Promise<FeatureCollection | undefined> {
  const routeBoundingBox: BBox = bbox(routeGeoJSON);
  const query = waterwaysWaysInBboxQuery(routeBoundingBox);
  const osmData = await fetchOverpassData(query);
  if (!osmData) {
    console.error(
      `No osm features returned for Overpass query: ${query}`
    );
    return;
  }
  const relationsGeoJSON = parseOSMToGeoJSON(osmData);
  const lineStringFeatures = relationsGeoJSON.features.filter(
    (feature) => feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString"
  ) as Feature<LineString | MultiLineString>[];
  const intersectingWaterways = intersectingFeatures(
    featureCollection(lineStringFeatures),
    routeGeoJSON
  );
  return intersectingWaterways;
}

export async function calculateSurroundingWays(
  routeGeoJSON: Feature<LineString>): Promise<FeatureCollection | undefined> {
  const routeBoundingBox: BBox = bbox(routeGeoJSON);
  const query = waterwaysWaysInBboxQuery(routeBoundingBox);
  const osmData = await fetchOverpassData(query);
  if (!osmData) {
    console.error(
      `No osm features returned for Overpass query: ${query}`
    );
    return;
  }
  return parseOSMToGeoJSON(osmData)
}

export async function calculateIntersectingWaterwaysGeojson(
  routeGeoJSON: Feature<LineString>
): Promise<FeatureCollection | undefined> {
  try {
    const routeBoundingBox: BBox = bbox(routeGeoJSON);
    const waterwaysQuery = waterwaysInBboxQuery(routeBoundingBox);
    const osmData = await fetchOverpassData(waterwaysQuery);
    if (!osmData) {
      console.error(
        `No osm features returned for Overpass query: ${waterwaysQuery}`
      );
      return;
    }
    const waterwaysGeoJSON = parseOSMToGeoJSON(osmData);
    const combined = combineSameNameFeatures(waterwaysGeoJSON) as FeatureCollection<LineString | MultiLineString>;
    const intersectingWaterways = intersectingFeatures(
      combined,
      routeGeoJSON
    );
    return intersectingWaterways;
  } catch (error) {
    console.error("Error processing GeoJSON:", error);
    return;
  }
}

export async function getWaterwaysForArea(areaName: string): Promise<FeatureCollection | undefined> {
  const waterwaysQuery = await waterwaysInAreaQuery(areaName);
  const osmData = await fetchOverpassData(waterwaysQuery);
  if (!osmData) {
    console.error(
      `No osm features returned for Overpass query: ${waterwaysQuery}`
    );
    return;
  }
  const waterwaysGeoJSON = parseOSMToGeoJSON(osmData);
  const combined = combineSameNameFeatures(waterwaysGeoJSON) as FeatureCollection<LineString | MultiLineString>;
  return combined;
}

export async function getMainWaterwaysForArea(areaName: string): Promise<FeatureCollection | undefined> {
  const waterwaysQuery = await waterwaysRelationsInAreaQuery(areaName);
  const osmData = await fetchOverpassData(waterwaysQuery);
  if (!osmData) {
    console.error(
      `No osm features returned for Overpass query: ${waterwaysQuery}`
    );
    return;
  }
  const waterwaysGeoJSON = parseOSMToGeoJSON(osmData);
  const combined = combineSameNameFeatures(waterwaysGeoJSON) as FeatureCollection<LineString | MultiLineString>;
  return combined;
}

export async function getCityAdTownAreaIds(routeGeoJSON: Feature<LineString, {
  [name: string]: any;
}>): Promise<number[]> {
  const routeBoundingBox: BBox = bbox(routeGeoJSON);
  const overpassQuery = citiesInBboxQuery(routeBoundingBox);
  const response = await fetchOverpassData(overpassQuery);
  const data = JSON.parse(response);
  const cityIds = data.elements.map((element: any) => element.id);
  return cityIds;
}

export function parseOSMToGeoJSON(
  osmData: string
): FeatureCollection<Geometry, GeoJsonProperties> {
  return osmtogeojson(osmData);
}

export async function parseGPXToGeoJSON(GPXContents: string) {
  const doc = new DOMParser().parseFromString(GPXContents, "text/xml");
  return toGeoJSON.gpx(doc);
}

// Find intersecting features between a route and a FeatureCollection of LineStrings or MultiLineStrings
export function intersectingFeatures(
  fc: FeatureCollection<LineString | MultiLineString>,
  routeLineString: Feature<LineString>
): FeatureCollection {
  const intersectingFeatures = [];
  for (const feature of fc.features) {
    if (booleanIntersects(feature, routeLineString, { ignoreSelfIntersections: true })) {
      intersectingFeatures.push(feature);
    }
  }
  return featureCollection(intersectingFeatures);
}


// Combine features with the same name into single features
function combineSameNameFeatures(
  osmData: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const namedFeatures = osmData.features.filter((feature: Feature) => feature.properties?.name);


  const groupedFeatures: object = groupBy(
    namedFeatures,
    (feature: Feature) => feature.properties && feature.properties.name
  );

  const combinedFeatures: Feature[] = Object.values(groupedFeatures).map(
    (group) => {
      if (group.length > 1) {
        const combined = combine(featureCollection(group as Feature<LineString | MultiLineString>[]));

        const combinedFeature = combined.features[0] as any;
        if (combined.features.length > 1) {
          console.error(
            "combined.features.length > 1",
            combined.features.length,
            combined
          );
        }

        // add a name property to the combinedfeature.properties and set to group[0].properties.name for later use as a identifier
        combinedFeature.properties.name = group[0].properties.name;
        return combinedFeature;
      }
      return group[0];
    }
  );
  return featureCollection(combinedFeatures);
}

// For a fc which has only intersecting features, return the first point that each feature intersects and the distance along the LineString from the start, then return the intersecting waterways ordered by the ascending distance 
export function orderAlongRoute(
  fc: FeatureCollection<any>,
  routeLineString: Feature<LineString>
): FeatureCollection<LineString | MultiLineString> {
  // for each of the features in the feature collection, find the first intersection point with the routeLineString and the distance along the routeLineString

  const enrichedFeatures = fc.features.map((feature) => {
    const intersection = firstIntersection(feature, routeLineString);
    if (intersection) {
      const slicedLine = lineSlice(
        point(routeLineString.geometry.coordinates[0]),
        intersection,
        routeLineString
      );
      const distance = length(slicedLine);
      return {
        feature,
        intersection,
        distance
      };
    }
    return null;
  }).filter((enrichedFeature) => enrichedFeature !== null) as { feature: Feature<LineString | MultiLineString>, intersection: Feature<Point>, distance: number }[];
  console.log(enrichedFeatures)

  // return the orderedFeatureCollection as a FeatureCollection of LineStrings or MultiLineStrings with a property intersection which is the first intersection point, they should be ordered by the distance
  const orderFeatures = enrichedFeatures.sort((a, b) => a.distance - b.distance)
  // TODO: add the intersection to properties.intersection 

  return featureCollection(orderFeatures.map((feature) => feature.feature))
}

function firstIntersection(
  feature: Feature<LineString | MultiLineString>,
  routeLineString: Feature<LineString>
): Feature<Point> | null {
  const intersections = lineIntersect(feature, routeLineString);
  if (intersections.features.length > 0) {
    // sort the intersections by the distance along the routeLineString
    intersections.features.sort((a, b) => {
      const aDistance = length(lineSlice(
        point(routeLineString.geometry.coordinates[0]),
        a as Feature<Point>,
        routeLineString
      ));
      const bDistance = length(lineSlice(
        point(routeLineString.geometry.coordinates[0]),
        b as Feature<Point>,
        routeLineString
      ));
      return aDistance - bDistance;
    });
    return intersections.features[0];
  }
  return null;
}

export function createWaterwaysMessage(
  featureCollection: FeatureCollection
): string {
  let names: string[] = [];
  featureCollection.features.forEach((feature) => {
    names.push(feature.properties.name);
  });
  if (names.length > 1) {
    return `Crossed ${names.length} waterways 🏞️ ${names.join(
      " | "
    )} 🌐 Powered by Kreuzungen World 🗺️`
  } else {
    return `Crossed ${names.length} waterway 🏞️ ${names[0]} 🌐 Powered by Kreuzungen World 🗺️`
  }
}

// Check if a string contains a waterways message using a regex
export function doesStringContainWaterwaysMessage(description: string): boolean {
    // Match pattern: "Crossed X waterway(s)" followed by waterway names and ending with "Powered by Kreuzungen World"
    const pattern = /Crossed \d+ waterways? 🏞️.*🌐 Powered by Kreuzungen World 🗺️/;
    return pattern.test(description);
}

// Remove a waterways message from a string using a regex, also remove any newline characters before the message
export function removeWaterwaysMessage(description: string): string {
    const pattern = /Crossed \d+ waterways? 🏞️.*?🌐 Powered by Kreuzungen World 🗺️[\s\n]*/g;
    return description.replace(pattern, '').trim();
}

// Append a waterways message to a description
export function appendWaterwaysMessage(
  description: string,
  waterwaysMessage: string
): string {
  return `${description}\n\n${waterwaysMessage}`;
}