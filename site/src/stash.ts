import { Feature, LineString } from "geojson";

// Get a saved route
export async function getSavedRoute(
    routeId: string,
): Promise<Feature<LineString>> {
    try {
        const response = await fetch("https://kreuzungen.fly.dev/get_geojson_feature", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `routeId=${routeId}`,
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
export async function saveRoute(route: Feature<LineString>): Promise<void> {
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
    } catch (error) {
        console.error("Error saving route:", error);
        throw new Error("Failed to save route");
    }
}