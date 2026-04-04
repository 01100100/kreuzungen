import { area } from "@turf/area";
import { bboxPolygon } from "@turf/bbox-polygon";
import type { BBox, FeatureCollection } from "geojson";

// Define Constants
const POSTPASS_ENDPOINT = "https://postpass.geofabrik.de/api/0.2/interpreter";
const bboxSizeLimit_m2 = 10000000000; // maximum size limit for a bounding box in square meters

// Normalize Postpass response features to match the flat property format
// that downstream code expects (flattens tags into top-level properties)
export function normalizePostpassFeatures(
	fc: FeatureCollection,
): FeatureCollection {
	for (const feature of fc.features) {
		const { osm_type, osm_id, tags, ...rest } = feature.properties;
		const typePrefix =
			osm_type === "R" ? "relation" : osm_type === "W" ? "way" : "node";
		feature.properties = {
			...rest,
			...tags,
			id: `${typePrefix}/${osm_id}`,
		};
		feature.id = `${typePrefix}/${osm_id}`;
	}
	return fc;
}

// Fetch data from the Postpass API
export async function fetchPostpassData(
	sql: string,
): Promise<FeatureCollection> {
	const response = await fetch(POSTPASS_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: `data=${encodeURIComponent(sql)}`,
	});
	if (response.ok) {
		return response.json();
	} else {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
}

// Create a query for waterways within a bounding box, if the bounding box is too big only fetch relations
export function waterwaysInBboxQuery(bbox: BBox): string {
	const envelope = `ST_MakeEnvelope(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},4326)`;
	let waterwaysQuery = `SELECT osm_type, osm_id, tags, geom FROM postpass_line WHERE tags->>'waterway' IS NOT NULL AND geom && ${envelope}`;
	if (area(bboxPolygon(bbox)) > bboxSizeLimit_m2) {
		console.log(
			"The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways).",
		);
		console.log(`${area(bboxPolygon(bbox))} m**2 > ${bboxSizeLimit_m2}`);
		waterwaysQuery = `SELECT osm_type, osm_id, tags, geom FROM postpass_line WHERE tags->>'waterway' IS NOT NULL AND osm_type = 'R' AND geom && ${envelope}`;
	}
	return waterwaysQuery;
}

export function waterwaysRelationsInBboxQuery(bbox: BBox): string {
	return `SELECT osm_type, osm_id, tags, geom FROM postpass_line WHERE tags->>'waterway' IS NOT NULL AND osm_type = 'R' AND geom && ST_MakeEnvelope(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},4326)`;
}

export function waterwaysWaysInBboxQuery(bbox: BBox): string {
	return `SELECT osm_type, osm_id, tags, geom FROM postpass_line WHERE tags->>'waterway' IS NOT NULL AND tags->>'name' IS NOT NULL AND osm_type = 'W' AND geom && ST_MakeEnvelope(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},4326)`;
}

export async function waterwaysInAreaQuery(areaName: string): Promise<string> {
	const areaId = await getAreaIdPhoton(areaName);
	return `SELECT l.osm_type, l.osm_id, l.tags, l.geom FROM postpass_line l WHERE l.tags->>'waterway' IS NOT NULL AND ST_Intersects(l.geom, (SELECT geom FROM postpass_polygon WHERE osm_id = ${areaId} AND osm_type = 'R'))`;
}

export async function waterwaysRelationsInAreaQuery(
	areaName: string,
): Promise<string> {
	const areaId = await getAreaIdPhoton(areaName);
	return `SELECT l.osm_type, l.osm_id, l.tags, l.geom FROM postpass_line l WHERE l.tags->>'waterway' IS NOT NULL AND l.osm_type = 'R' AND ST_Intersects(l.geom, (SELECT geom FROM postpass_polygon WHERE osm_id = ${areaId} AND osm_type = 'R'))`;
}

export function citiesInBboxQuery(bbox: BBox): string {
	return `SELECT osm_type, osm_id, tags, geom FROM postpass_polygon WHERE (tags->>'place' = 'city' OR tags->>'place' = 'town' OR tags->>'place' = 'village') AND geom && ST_MakeEnvelope(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},4326)`;
}

async function getAreaIdPhoton(areaName: string): Promise<number> {
	// https://photon.komoot.io has a more liberal Terms of service then Nominatim
	const response = await fetch(
		`https://photon.komoot.io/api/?q=${areaName}&limit=1`,
	);
	if (response.ok) {
		const data = await response.json();
		if (data.features.length > 0) {
			// data.features[0].properties.osm_type ('N', 'W', 'R') indicates the type of the OSM object (node, way, relation)
			return data.features[0].properties.osm_id;
		}
	} else {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
}
