import polyline from "@mapbox/polyline";
import {
  bbox,
  booleanIntersects,
  combine,
  featureCollection,
} from "@turf/turf";
import osmtogeojson from "osmtogeojson";
import { DOMParser } from "xmldom";
import { groupBy } from "lodash";
import {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  Feature,
  LineString,
  BBox,
} from "geojson";
import { fetchOverpassData, makeWaterwaysQuery } from "./overpass";

export async function calculateIntersectingWaterways(
  polylineString: string
): Promise<(Feature | FeatureCollection)[] | undefined> {
  try {
    const routeGeoJSON: LineString = polyline.toGeoJSON(polylineString);
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
    const combined = combineSameNameFeatures(waterwaysGeoJSON);
    const intersectingWaterways = filterIntersectingWaterways(
      combined,
      routeGeoJSON
    );
    console.log(intersectingWaterways);
    return intersectingWaterways;
  } catch (error) {
    console.error("Error processing GeoJSON:", error);
    return;
  }
}

// Parse OSM XML data to GeoJSON
function parseOSMToGeoJSON(
  osmData: string
): FeatureCollection<Geometry, GeoJsonProperties> {
  const dom = new DOMParser().parseFromString(osmData, "text/xml");
  return osmtogeojson(dom);
}

// Filter waterways that intersect with the route
function filterIntersectingWaterways(
  waterwaysGeoJSON: FeatureCollection,
  routeGeoJSON: LineString
): Feature[] {
  return waterwaysGeoJSON.features.filter((feature) =>
    booleanIntersects(feature, routeGeoJSON)
  );
}

function combineSameNameFeatures(
  osmData: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const groupedFeatures: object = groupBy(
    osmData.features,
    (feature: Feature) => feature.properties && feature.properties.name
  );
  const combinedFeatures: Feature[] = Object.values(groupedFeatures).map(
    (group) => {
      if (group.length > 1) {
        return combine(featureCollection(group));
      }
      return group[0];
    }
  );

  return featureCollection(combinedFeatures);
}
