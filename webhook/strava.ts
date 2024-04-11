import fetch from 'node-fetch';
import { createClient } from "redis";
type RedisClientType = ReturnType<typeof createClient>;

// Get a Strava refresh token for a user stored in redis
export async function getStravaRefreshToken(user_id: number, redisClient: RedisClientType): Promise<string> {
    try {
        const refreshToken = await redisClient.get(user_id.toString());
        if (!refreshToken) {
            console.error('No refresh token found for user_id:', user_id);
            throw new Error(`No refresh token found for user_id: ${user_id}`);
        }
        return refreshToken;
    } catch (error) {
        console.error('Error getting refresh token from Redis:', error);
        throw new Error('Failed to get Strava refresh token');
    }
}

// Get a new Strava access token for a user
export async function getStravaAccessToken(user_id: number, redisClient: RedisClientType): Promise<string> {
    try {
        const refreshToken = await getStravaRefreshToken(user_id, redisClient);
        const response = await fetch('https://kreuzungen.fly.dev/reoauth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `refreshToken=${refreshToken}`
        });
        if (!response.ok) {
            throw new Error(`Failed to get Strava access token. Status: ${response.status}`);
        }
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting Strava access token:', error);
        throw new Error('Failed to get Strava access token');
    }
}

// Get data for a Strava activity
export async function getStravaActivity(activity_id: number, owner_access_token: string): Promise<any> {
    try {
        const response = await fetch(`https://www.strava.com/api/v3/activities/${activity_id}`, {
            headers: {
                'Authorization': `Bearer ${owner_access_token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get Strava activity ${activity_id} data. Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error getting Strava activity ${activity_id} data:`, error);
        throw new Error(`Failed to get Strava activity ${activity_id} data`);
    }
}

// Update the description of a Strava activity
export async function updateStravaActivityDescription(activity_id: number, owner_access_token: string, description: string) {
    try {
        const response = await fetch(`https://www.strava.com/api/v3/activities/${activity_id}`, {
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
                const errorResponse = await response.json();
                errorMessage = errorResponse.message;
            } catch {
                errorMessage = 'Unknown error occurred';
            }
            throw new Error(`Failed to update Strava activity ${activity_id} description. Status: ${response.status}. Error: ${errorMessage}`);
        } else {
            console.log(`Updated Strava activity ${activity_id} description`);
        }
    } catch (error) {
        console.error(`Error updating Strava activity ${activity_id} description:`, error);
        throw new Error(`Failed to update Strava activity ${activity_id} description`);
    }
}
