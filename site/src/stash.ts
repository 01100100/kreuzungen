import { Feature, LineString } from "geojson";

// Get a saved route
export async function getSavedRoute(
    routeId: string,
): Promise<Feature<LineString>> {
    if (!routeId) {
        throw new Error("Route ID is not set");
    }
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

// ping a route id to the serve to log it
export async function logUpdateRoute(routeId: number): Promise<any> {
    try {
        const response = await fetch(`https://kreuzungen.fly.dev/activity?routeId=${routeId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to log update. Status: ${response.status}`
            );
        }
        return await response.json();
    } catch (error) {
        console.error("Error logging update:", error);
        throw new Error("Failed to log update");
    }
}