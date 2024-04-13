import { BBox } from "geojson";
import { area, bboxPolygon } from "@turf/turf";

// Define Constants
const bboxSizeLimit_m2 = 500000000; // maximum size limit for a bounding box in square meters

// Create a query for the Overpass API to fetch waterways within a bounding box, if the bounding box is too big only fetch relations
export function makeWaterwaysQuery(bbox: BBox): string {
  let waterwaysQuery = `(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;
  if (area(bboxPolygon(bbox)) > bboxSizeLimit_m2) {
    console.log(
      "The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways) from the OSM overpass api."
    );
    console.log(`${area(bboxPolygon(bbox))} m**2 > ${bboxSizeLimit_m2}`);
    waterwaysQuery = `rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`;
  }
  return waterwaysQuery;
}

// Fetch data from the Overpass API
export async function fetchOverpassData(
  waterwaysQuery: string
): Promise<string> {
  const response = await fetch("https://www.overpass-api.de/api/interpreter?", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: waterwaysQuery,
  });
  if (response.ok) {
    const text = await response.text();
    return text;
  } else {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}