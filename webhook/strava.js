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
exports.updateStravaActivityDescription = exports.getStravaActivity = exports.getStravaAccessToken = exports.getStravaRefreshToken = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
// Get a Strava refresh token for a user stored in redis
function getStravaRefreshToken(user_id, redisClient) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const refreshToken = yield redisClient.get(user_id.toString());
            if (!refreshToken) {
                console.error('No refresh token found for user_id:', user_id);
                throw new Error(`No refresh token found for user_id: ${user_id}`);
            }
            return refreshToken;
        }
        catch (error) {
            console.error('Error getting refresh token from Redis:', error);
            throw new Error('Failed to get Strava refresh token');
        }
    });
}
exports.getStravaRefreshToken = getStravaRefreshToken;
// Get a new Strava access token for a user
function getStravaAccessToken(user_id, redisClient) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const refreshToken = yield getStravaRefreshToken(user_id, redisClient);
            const response = yield (0, node_fetch_1.default)('https://kreuzungen.fly.dev/reoauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `refreshToken=${refreshToken}`
            });
            if (!response.ok) {
                throw new Error(`Failed to get Strava access token. Status: ${response.status}`);
            }
            const data = yield response.json();
            return data.access_token;
        }
        catch (error) {
            console.error('Error getting Strava access token:', error);
            throw new Error('Failed to get Strava access token');
        }
    });
}
exports.getStravaAccessToken = getStravaAccessToken;
// Get data for a Strava activity
function getStravaActivity(activity_id, owner_access_token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield (0, node_fetch_1.default)(`https://www.strava.com/api/v3/activities/${activity_id}`, {
                headers: {
                    'Authorization': `Bearer ${owner_access_token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to get Strava activity ${activity_id} data. Status: ${response.status}`);
            }
            const data = yield response.json();
            return data;
        }
        catch (error) {
            console.error(`Error getting Strava activity ${activity_id} data:`, error);
            throw new Error(`Failed to get Strava activity ${activity_id} data`);
        }
    });
}
exports.getStravaActivity = getStravaActivity;
// Update the description of a Strava activity
function updateStravaActivityDescription(activity_id, owner_access_token, description) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield (0, node_fetch_1.default)(`https://www.strava.com/api/v3/activities/${activity_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${owner_access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description
                })
            });
            if (!response.ok) {
                let errorMessage = '';
                try {
                    const errorResponse = yield response.json();
                    errorMessage = errorResponse.message;
                }
                catch (_a) {
                    errorMessage = 'Unknown error occurred';
                }
                throw new Error(`Failed to update Strava activity ${activity_id} description. Status: ${response.status}. Error: ${errorMessage}`);
            }
            else {
                console.log(`Updated Strava activity ${activity_id} description`);
            }
        }
        catch (error) {
            console.error(`Error updating Strava activity ${activity_id} description:`, error);
            throw new Error(`Failed to update Strava activity ${activity_id} description`);
        }
    });
}
exports.updateStravaActivityDescription = updateStravaActivityDescription;
