import polyline from "@mapbox/polyline";
import {
  bbox,
  combine,
  featureCollection,
  feature,
  lineString,
  lineIntersect,
} from "@turf/turf";
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
import { fetchOverpassData, makeWaterwaysQuery } from "./overpass";

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
    console.log("combined", combined);
    console.log("routeGeoJSON", routeGeoJSON);
    const intersectingWaterways = findIntersectingFeatures(
      combined,
      routeGeoJSON
    );
    return intersectingWaterways;
  } catch (error) {
    console.error("Error processing GeoJSON:", error);
    return;
  }
}

// Parse OSM XML data to GeoJSON
export function parseOSMToGeoJSON(
  osmData: string
): FeatureCollection<Geometry, GeoJsonProperties> {
  const dom = new DOMParser().parseFromString(osmData, "text/xml");
  return osmtogeojson(dom);
}

// import { booleanDisjoint } from "@turf/boolean-disjoint";
// import { flattenEach } from "@turf/meta";

// function booleanIntersects(feature1, feature2) {
//   let bool = false;

//   flattenEach(feature1, (flatten1) => {
//     flattenEach(feature2, (flatten2) => {

//       if (bool === true) {
//         return true;
//       }
//       console.log(feature1.properties.name, flatten1.geometry, feature2.properties.name, flatten2.geometry, !booleanDisjoint(flatten1.geometry, flatten2.geometry));

//       bool = !booleanDisjoint(flatten1.geometry, flatten2.geometry);
//     });
//   });
//   return bool;
// }

export function findIntersectingFeatures(
  fc: FeatureCollection<LineString | MultiLineString>,
  routeLineString: Feature<LineString>
): FeatureCollection {
  // TODO: implement this to return on the first Intersection instead of calculating all of the intersections.  https://github.com/rowanwins/sweepline-intersections

  const intersectingFeatures = [];
  for (const feature of fc.features) {
    const x = lineIntersect(feature, routeLineString, { ignoreSelfIntersections: true });
    if (x.features.length > 0) {
      intersectingFeatures.push(feature);
    }
  }
  return featureCollection(intersectingFeatures);
}

// function booleanDisjoint(
//   feature1: Feature<any> | Geometry,
//   feature2: Feature<any> | Geometry
// ): boolean {
//   let bool = true;
//   flattenEach(feature1, (flatten1) => {
//     flattenEach(feature2, (flatten2) => {
//       if (bool === false) {
//         return false;
//       }
//       bool = disjoint(flatten1.geometry, flatten2.geometry);
//     });
//   });
//   return bool;
// }


function combineSameNameFeatures(
  osmData: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, GeoJsonProperties> {
  const groupedFeatures: object = groupBy(
    osmData.features,
    (feature: Feature) => feature.properties && feature.properties.name
  );
  // remove features without a name
  delete groupedFeatures["undefined"];

  const combinedFeatures: Feature[] = Object.values(groupedFeatures).map(
    (group) => {
      if (group.length > 1) {
        // todo: check if any of the combined features have more than one feature
        const combined = combine(featureCollection(group));
        const combinedFeature: Feature<Geometry, GeoJsonProperties> =
          combined.features[0];
        if (combined.features.length > 1) {
          console.error(
            "combined.features.length > 1",
            combined.features.length,
            combined
          );
        }
        // add a name property to the combined feature
        combinedFeature.properties.name = group[0].properties.name;
        return combinedFeature;
      }
      return group[0];
    }
  );
  return featureCollection(combinedFeatures);
}
