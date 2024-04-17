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
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const redis_1 = require("redis");
const strava_1 = require("./strava");
const geo_1 = require("./geo");
const app = (0, express_1.default)().use(body_parser_1.default.json());
const redisClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
redisClient.on("error", (error) => {
    console.error(`Redis client error:`, error);
});
// The main asynchronous function
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisClient.connect();
            app.listen(process.env.PORT || 80, () => console.log("webhook is listening"));
        }
        catch (error) {
            console.error("Error connecting to Redis:", error);
        }
    });
}
// Run the async function
main();
// Define a GET route for '/webhook' to verify the webhook subscription with Strava
app.get("/webhook", (req, res) => {
    const VERIFY_TOKEN = "STRAVA";
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            res.json({ "hub.challenge": challenge });
        }
        else {
            res.sendStatus(403);
        }
    }
});
// Define a POST route for '/webhook' to receive and process incoming events
app.post("/webhook", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("webhook event received!", req.query, req.body);
    const event = req.body;
    if (event.aspect_type === "create" && event.object_type === "activity") {
        try {
            const activity_id = event.object_id;
            const owner_id = event.owner_id;
            const owner_access_token = yield (0, strava_1.getStravaAccessToken)(owner_id, redisClient);
            if (!owner_access_token) {
                console.error("No access token found for user_id: " + owner_id);
                res.status(200).send("EVENT_RECEIVED");
                return;
            }
            const activityData = yield (0, strava_1.getStravaActivity)(activity_id, owner_access_token);
            // check that the activity has a summary polyline
            if (!activityData.map || !activityData.map.summary_polyline) {
                console.error("Activity does not have a summary polyline:", activityData);
                res.status(200).send("EVENT_RECEIVED");
                return;
            }
            // calculate intersecting waterways
            const intersectingWaterways = yield (0, geo_1.calculateIntersectingWaterways)(activityData.map.summary_polyline);
            if (!intersectingWaterways) {
                console.error("No intersecting waterways found");
                res.status(200).send("EVENT_RECEIVED");
                return;
            }
            if (intersectingWaterways.length === 0) {
                console.log("No intersecting waterways found");
                res.status(200).send("EVENT_RECEIVED");
                return;
            }
            intersectingWaterways.forEach((waterway) => {
                if ("features" in waterway) {
                    if (waterway.features.length === 0) {
                        console.log("No intersecting waterways found");
                        res.status(200).send("EVENT_RECEIVED");
                        return;
                    }
                }
            });
            console.log("Intersecting waterways found");
            console.log(intersectingWaterways);
            // create a message with the intersecting waterways
            const waterwaysMessage = createWaterwaysMessage(intersectingWaterways);
            // update the activity description with the waterways message if there are waterways
            yield (0, strava_1.updateStravaActivityDescription)(activity_id, owner_access_token, waterwaysMessage);
            console.log(`Activity ${activity_id} updated`);
        }
        catch (error) {
            console.error("Error updating activity description", error);
        }
    }
    res.status(200).send("EVENT_RECEIVED");
}));
function createWaterwaysMessage(features) {
    const names = [];
    features.forEach((feature) => {
        var _a, _b, _c;
        let name;
        if (feature.type === "FeatureCollection") {
            name = (_b = (_a = feature.features[0]) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b.collectedProperties[0].name;
        }
        else {
            name = (_c = feature.properties) === null || _c === void 0 ? void 0 : _c.name;
        }
        // only add the name is its not undefined
        if (name) {
            names.push(name);
        }
    });
    return `Crossed ${names.length} waterways 🏞️ ${names.join(" | ")} 🌐 https://kreuzungen.world 🗺️`;
}
// // combine all FeatureCollection features (which come from turf.combine )in a feature collection into a single feature
// function flattenFeatureCollectionFeatures(
//   featureCollection: FeatureCollection
// ): FeatureCollection {
//   const features = featureCollection.features;
//   // const combinedFeatures = features.map((feature) => {
//   //   if (feature.type === 'FeatureCollection') {
//   //     return (feature.features);
//   //   }
//   //   return feature;
//   // });
//   // return combinedFeatures;
//   return featureCollection;
// }
