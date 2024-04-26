import {
  bbox,
  combine,
  featureCollection,
} from "@turf/turf";
import { feature } from "@turf/helpers";
import { booleanIntersects } from "./durf"
import osmtogeojson from "osmtogeojson";
import { groupBy } from "lodash";
import {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  Feature,
  LineString,
  BBox,
  MultiLineString
} from "geojson";
import polyline from "@mapbox/polyline";
import toGeoJSON from "@mapbox/togeojson";
import { fetchOverpassData, makeWaterwaysQuery } from "./overpass";


export async function calculateIntersectingWaterwaysPolyline(polylineString: string): Promise<FeatureCollection | undefined> {
  const geojson = feature(polyline.toGeoJSON(polylineString));
  return calculateIntersectingWaterwaysGeojson(geojson);
}


export async function calculateIntersectingWaterwaysGeojson(
  routeGeoJSON: Feature<LineString>
): Promise<FeatureCollection | undefined> {
  try {
    const routeBoundingBox: BBox = bbox(routeGeoJSON);
    const waterwaysQuery = makeWaterwaysQuery(routeBoundingBox);
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
    if (booleanIntersects(feature, routeLineString)) {
      intersectingFeatures.push(feature);
    }
  }
  return featureCollection(intersectingFeatures);
}


// Combine features with the same name into single features
function combineSameNameFeatures(
  osmData: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const namedFeatures = osmData.features.filter(
    (feature: Feature) => feature.properties && feature.properties.name
  );

  const groupedFeatures: object = groupBy(
    namedFeatures,
    (feature: Feature) => feature.properties && feature.properties.name
  );

  const combinedFeatures: Feature[] = Object.values(groupedFeatures).map(
    (group) => {
      if (group.length > 1) {
        const combined = combine(featureCollection(group));

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


export function createWaterwaysMessage(
  featureCollection: FeatureCollection
): string {
  let names: string[] = [];
  // For each feature in the feature collection, take the properties dot name value and add it to the names array. 
  featureCollection.features.forEach((feature) => {
    let name: string;
    name = feature.properties.name;
    names.push(name);
  });
  return `Crossed ${names.length} waterways 🏞️ ${names.join(
    " | "
  )} 🌐 https://kreuzungen.world 🗺️`;
}
