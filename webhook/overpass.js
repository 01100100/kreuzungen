"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOverpassData = exports.makeWaterwaysQuery = void 0;
const turf_1 = require("@turf/turf");
// Define Constants
const bboxSizeLimit_m2 = 500000000; // maximum size limit for a bounding box in square meters
// Create a query for the Overpass API to fetch waterways within a bounding box, if the bounding box is too big only fetch relations
function makeWaterwaysQuery(bbox) {
    let waterwaysQuery = `(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;
    if ((0, turf_1.area)((0, turf_1.bboxPolygon)(bbox)) > bboxSizeLimit_m2) {
        console.log("The Bbox is too big. To reduce the computation on the client size the fetch only bigger waterways (OSM relations) and ignore smaller streams (OSM ways) from the OSM overpass api.");
        console.log(`${(0, turf_1.area)((0, turf_1.bboxPolygon)(bbox))} m**2 > ${bboxSizeLimit_m2}`);
        waterwaysQuery = `rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`;
    }
    return waterwaysQuery;
}
exports.makeWaterwaysQuery = makeWaterwaysQuery;
// Fetch data from the Overpass API
function fetchOverpassData(waterwaysQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("https://www.overpass-api.de/api/interpreter?", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: waterwaysQuery,
        });
        if (response.ok) {
            const text = yield response.text();
            return text;
        }
        else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    });
}
exports.fetchOverpassData = fetchOverpassData;
