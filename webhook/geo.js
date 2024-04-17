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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateIntersectingWaterways = void 0;
const polyline_1 = __importDefault(require("@mapbox/polyline"));
const turf_1 = require("@turf/turf");
const osmtogeojson_1 = __importDefault(require("osmtogeojson"));
const xmldom_1 = require("xmldom");
const lodash_1 = require("lodash");
const overpass_1 = require("./overpass");
function calculateIntersectingWaterways(polylineString) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const routeGeoJSON = polyline_1.default.toGeoJSON(polylineString);
            const routeBoundingBox = (0, turf_1.bbox)(routeGeoJSON);
            const waterwaysQuery = (0, overpass_1.makeWaterwaysQuery)(routeBoundingBox);
            const osmData = yield (0, overpass_1.fetchOverpassData)(waterwaysQuery);
            if (!osmData) {
                console.error(`No osm features returned for Overpass query: ${waterwaysQuery}`);
                return;
            }
            const waterwaysGeoJSON = parseOSMToGeoJSON(osmData);
            const combined = combineSameNameFeatures(waterwaysGeoJSON);
            const intersectingWaterways = filterIntersectingWaterways(combined, routeGeoJSON);
            console.log(intersectingWaterways);
            return intersectingWaterways;
        }
        catch (error) {
            console.error("Error processing GeoJSON:", error);
            return;
        }
    });
}
exports.calculateIntersectingWaterways = calculateIntersectingWaterways;
// Parse OSM XML data to GeoJSON
function parseOSMToGeoJSON(osmData) {
    const dom = new xmldom_1.DOMParser().parseFromString(osmData, "text/xml");
    return (0, osmtogeojson_1.default)(dom);
}
// Filter waterways that intersect with the route
function filterIntersectingWaterways(waterwaysGeoJSON, routeGeoJSON) {
    return waterwaysGeoJSON.features.filter((feature) => (0, turf_1.booleanIntersects)(feature, routeGeoJSON));
}
function combineSameNameFeatures(osmData) {
    const groupedFeatures = (0, lodash_1.groupBy)(osmData.features, (feature) => feature.properties && feature.properties.name);
    const combinedFeatures = Object.values(groupedFeatures).map((group) => {
        if (group.length > 1) {
            return (0, turf_1.combine)((0, turf_1.featureCollection)(group));
        }
        return group[0];
    });
    return (0, turf_1.featureCollection)(combinedFeatures);
}
