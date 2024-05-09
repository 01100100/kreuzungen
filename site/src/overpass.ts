import { BBox } from "geojson";
import { area, bboxPolygon } from "@turf/turf";
import { flashMessage } from "./ui"

// Define Constants
const bboxSizeLimit_m2 = 10000000000; // maximum size limit for a bounding box in square meters

// Create a query for the Overpass API to fetch waterways within a bounding box, if the bounding box is too big only fetch relations
export function waterwaysInBboxQuery(bbox: BBox): string {
  let waterwaysQuery = `[out:json];(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;
  if (area(bboxPolygon(bbox)) > bboxSizeLimit_m2) {
    // TODO: take user input whether to fetch smaller waterways
    console.log(
      "The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways) from the OSM overpass api."
    );

    console.log(`${area(bboxPolygon(bbox))} m**2 > ${bboxSizeLimit_m2}`);
    waterwaysQuery = `[out:json];rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`;
  }
  return waterwaysQuery;
}

export async function waterwaysInAreaQuery(areaName: string): Promise<string> {
  const areaId = await getAreaId(areaName);
  return `[out:json];(rel(area:${areaId + 3600000000})["waterway"];way(area:${areaId + 3600000000})["waterway"];)->._;out geom;`;
}

export async function waterwaysRelationsInAreaQuery(areaName: string): Promise<string> {
  const areaId = await getAreaId(areaName);
  return `[out:json]; rel(area:${areaId + 3600000000})["waterway"]; out geom;
  `;
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
    const text = await response.json();
    return text;
  } else {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

// Fetch data from Nominatim API
export async function getAreaId(areaName: string): Promise<number> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${areaName}`);
  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) {
      return data[0].osm_id;
    }
  } else {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}
