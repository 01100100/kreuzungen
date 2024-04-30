import { Feature, LineString } from "geojson";

// Get a saved route
export async function getSavedRoute(
    routeId: string,
): Promise<Feature<LineString>> {
    if (!routeId) {
        throw new Error("Route ID is not set");
    }
    // rest of the code...
    try {
        console.log("fetching saved route with id: ", routeId);
        const response = await fetch(`https://kreuzungen.fly.dev/get_geojson_feature?id=${routeId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to get saved route. Status: ${response.status}`
            );
        }
        const data = (await response.json()) as Feature<LineString>;
        return data
    } catch (error) {
        console.error("Error getting saved:", error);
        throw new Error("Failed to get saved");
    }
}

// Save a route
export async function saveRoute(route: Feature<LineString>): Promise<any> {
    try {
        const response = await fetch("https://kreuzungen.fly.dev/save_geojson_feature", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(route),
        });
        if (!response.ok) {
            throw new Error(
                `Failed to save route. Status: ${response.status}`
            );
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving route:", error);
        throw new Error("Failed to save route");
    }
}

// Delete a route
// TODO: 

// log a route_id to back end
export async function logUpdateRoute(routeId: number): Promise<any> {
    try {
        const response = await fetch("https://shredhook.fly.dev/log_update_route", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ routeId }),
        });
        if (!response.ok) {
            throw new Error(
                `Failed to log update route. Status: ${response.status}`
            );
        }
        return await response.json();
    }
    catch (error) {
        console.error("Error logging route:", error);
        throw new Error("Failed to log route");
    }
}