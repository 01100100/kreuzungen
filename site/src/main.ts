import maplibregl from "maplibre-gl";
import polyline from "@mapbox/polyline";
import * as turf from "@turf/turf";
import toGeoJSON from "@mapbox/togeojson";
import {
  FeatureCollection,
  Feature,
  LineString
} from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CustomAttributionControl,
  ShareControl,
  UploadControl,
  StravaControl,
  showInfo,
  displaySpinner,
} from "./ui";
import { calculateIntersectingWaterwaysGeojson } from "./geo";
import { setUp } from "./initialize";

// Define global variables
let isRouteDisplayed: boolean | null = null;
let displayedRouteGeoJSON = null;
let isIntersectingWaterwaysDisplayed: boolean | null = null;
let isMapCenteredToRoute = false;
let hoveredFeatureId: string | number | null | undefined = null;
export let shareableTitle = "Kreuzungen 🗺️";
export let shareableDescription =
  "Reveal the waterways that shape your adventures!";
export let shareableUrl = "https://kreuzungen.world";
export let shareableUrlEncoded = encodeURIComponent(shareableUrl);
export const mapInstance = createMap();

setUp();
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", processFileUpload, false);
document.querySelector("input").addEventListener("cancel", (evt) => {
  showInfo();
});

function clearRoute() {
  // Clear existing info and reset map state
  if (isRouteDisplayed) {
    mapInstance.removeLayerAndSource("route");
    isRouteDisplayed = null;
    displayedRouteGeoJSON = null;
    shareableUrl = null;
    shareableUrlEncoded = null;
  }
  const intersectingWaterwaysLayer = mapInstance.getLayer(
    "intersectingWaterways"
  );
  if (intersectingWaterwaysLayer) {
    mapInstance.removeLayerAndSource("intersectingWaterways");
    isIntersectingWaterwaysDisplayed = null;
  }
  const infoElement = document.getElementById("info");
  infoElement.innerHTML = "";
  infoElement.style.display = "none";
}

function processFileUpload(e) {
  const selectedFile = e.target.files[0];
  if (!selectedFile) return;

  const fileReader: any = new FileReader();
  fileReader.readAsText(selectedFile);
  fileReader.onload = async function (e) {
    const fileContents = e.target.result;
    const routeGeoJSON = await parseGPXToGeoJSON(fileContents);
    processGeojson(routeGeoJSON.features[0]);
  };
}

export async function processGeojson(
  routeGeoJSON: Feature<LineString>
) {
  clearRoute();
  addRoute(routeGeoJSON);
  fitMapToBoundingBox(turf.bbox(routeGeoJSON));

  displaySpinner("info");
  let intersectingWaterways = await calculateIntersectingWaterwaysGeojson(
    routeGeoJSON
  );

  if (!intersectingWaterways) {
    console.error("No intersecting waterways found");
    return;
  }
  displayIntersectingWaterways(intersectingWaterways);
  addMapInteractions()
  displayWaterwayNames(intersectingWaterways);
}

function createMap() {
  class ExtendedMap extends maplibregl.Map {
    removeLayerAndSource(name: string) {
      this.removeLayer(name);
      this.removeSource(name);
    }
  }
  const map = new ExtendedMap({
    container: "map",
    style:
      "https://api.maptiler.com/maps/topo-v2/style.json?key=ykqGqGPMAYuYgedgpBOY",
    center: [0, 51.4769], // Greenwich meridian
    zoom: 10,
    maxZoom: 18,
    minZoom: 5,
    attributionControl: false,
  });
  const attributionControl = new CustomAttributionControl({
    compact: true,
  });

  map.addControl(attributionControl);
  map.addControl(new maplibregl.FullscreenControl());
  const uploadControl = new UploadControl("fileInput", processFileUpload);
  map.addControl(uploadControl, "top-right");
  const stravaControl = new StravaControl();
  map.addControl(stravaControl, "top-right");
  const shareControl = new ShareControl();
  map.addControl(shareControl, "bottom-right");
  return map;
}

async function parseGPXToGeoJSON(contents: string) {
  const gpxDom = new DOMParser().parseFromString(contents, "text/xml");
  return toGeoJSON.gpx(gpxDom);
}

async function addRoute(routeGeoJSON) {
  mapInstance.addSource("route", { type: "geojson", data: routeGeoJSON });
  mapInstance.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#fc03ca", "line-width": 7 },
  });
  isRouteDisplayed = true;
  displayedRouteGeoJSON = routeGeoJSON;
  shareableUrl = `https://kreuzungen.world/index.html?route=${encodeURIComponent(
    polyline.fromGeoJSON(displayedRouteGeoJSON)
  )}`;
  shareableUrlEncoded = encodeURIComponent(shareableUrl);
  shareableDescription = `Check out the waterways that I crossed on my latest adventures!`;

  const sourceElement = document.getElementById("source");

  // minimize the attribution on a compact screen
  const attributionControl = mapInstance
    ._controls[0] as CustomAttributionControl;
  attributionControl._updateCompactMinimize();
  sourceElement.style.display = "block";
  sourceElement.innerHTML = `<i class="fa-solid fa-route"></i> ${routeGeoJSON.properties.name}`;

  if (routeGeoJSON.properties.url) {
    const urlElement = document.createElement("a");
    urlElement.href = routeGeoJSON.properties.url;
    urlElement.innerHTML = 'View on Strava <i class="fa-brands fa-strava"></i>';
    urlElement.style.fontWeight = "bold";
    urlElement.style.color = "#fff";

    // Create a new div element to contain the icon and link
    const linkContainer = document.createElement("div");

    // Add the icon to the link container
    linkContainer.innerHTML =
      '<i class="fa-solid fa-arrow-up-right-from-square"></i> ';

    // Append the link element to the link container
    linkContainer.appendChild(urlElement);

    sourceElement.appendChild(linkContainer);
  }

  // TODO: add more info.. date, length km and altitude gained.
}

function fitMapToBoundingBox(bbox) {
  mapInstance.fitBounds(bbox, { padding: 50, animate: true });
  isMapCenteredToRoute = true;
}

// Display intersecting waterways on the map, input is an array of FeatureCollections
function displayIntersectingWaterways(
  intersectingWaterways: FeatureCollection
) {
  console.log(intersectingWaterways);
  mapInstance.addSource("intersectingWaterways", {
    type: "geojson",
    data: intersectingWaterways,
    promoteId: "name",
  });

  mapInstance.addLayer({
    id: "intersectingWaterways",
    type: "line",
    source: "intersectingWaterways",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#0080ff",
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        1,
        0.6,
      ],
      "line-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        6,
        4,
      ],
    },
  });
}

function addMapInteractions() {
  // TODO: improve the ui by reducing the sensitivity.
  // https://github.com/acalcutt/maplibre-gl-inspect/blob/main/lib/MaplibreInspect.js#L159C1-L176C6
  mapInstance.on("click", "intersectingWaterways", (e) => {
    createPopUp(e);
  });

  mapInstance.on("mouseenter", "intersectingWaterways", (e) => {
    mapInstance.getCanvas().style.cursor = "pointer";
    hoveredFeatureId = e.features[0].id;
    mapInstance.setFeatureState(
      { source: "intersectingWaterways", id: hoveredFeatureId },
      { selected: true }
    );
  });

  // Hide popup on mouseleave event
  mapInstance.on("mouseleave", "intersectingWaterways", () => {
    mapInstance.getCanvas().style.cursor = "";
    if (hoveredFeatureId) {
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: hoveredFeatureId },
        { selected: false }
      );
    }
    hoveredFeatureId = null;
  });

  // Update selected property on mousemove event
  mapInstance.on("mousemove", "intersectingWaterways", (e) => {
    if (e.features.length > 0) {
      if (hoveredFeatureId) {
        mapInstance.setFeatureState(
          { source: "intersectingWaterways", id: hoveredFeatureId },
          { selected: false }
        );
      }
      hoveredFeatureId = e.features[0].id;
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: hoveredFeatureId },
        { selected: true }
      );
    }
  });
}

function createPopUp(
  x: maplibregl.MapMouseEvent & {
    features?: maplibregl.MapGeoJSONFeature[];
  } & Object
) {

  const riverName = x.features[0].properties.name;
  let destination = null
  let wikipedia = null
  let wikidata = null
  let type = null
  let urls = []
  if (x.features[0].geometry.type === "MultiLineString") {
    const collectedProps = JSON.parse(
      x.features[0].properties.collectedProperties
    );
    for (let i = 0; i < collectedProps.length; i++) {
      if (collectedProps[i].destination) {
        destination = collectedProps[i].destination
      }
      if (collectedProps[i].wikipedia) {
        wikipedia = collectedProps[i].wikipedia
      }
      if (collectedProps[i].wikidata) {
        wikidata = collectedProps[i].wikidata
      }
      if (collectedProps[i].type) {
        type = collectedProps[i].type
      }

      if (collectedProps[i].id) {
        urls.push(collectedProps[i].id)
      }
    }
  } else {
    destination = x.features[0].properties.destination
    wikipedia = x.features[0].properties.wikipedia
    wikidata = x.features[0].properties.wikidata
    type = x.features[0].properties.type
    urls = [x.features[0].properties.id]
  }

  let osmUrlsContent = "";

  osmUrlsContent = `
    <br>
    <details class="osm-details">
      <summary>OSM data</summary>
      <ul>
        ${urls.map((url) => `<li><a href="https://www.openstreetmap.org/${url}" target="_blank">https://www.openstreetmap.org/${url}</a></li>`).join("")}
      </ul>
    </details>
  `;

  let popupContent = `Name: ${riverName}`;

  if (destination) {
    popupContent += `<br>Destination: ${destination}`;
  }

  if (wikipedia) {
    const wikipediaUrl = `https://www.wikipedia.org/wiki/${wikipedia}`;
    popupContent += `<br>Wikipedia: <a href="${wikipediaUrl}" target="_blank">${wikipedia}</a>`;
  }

  if (wikidata) {
    const wikidataUrl = `https://www.wikidata.org/wiki/${wikidata}`;
    popupContent += `<br>Wikidata: <a href="${wikidataUrl}" target="_blank">${wikidata}</a>`;
  }

  if (type) {
    popupContent += `<br>Type: ${type}`;
  }

  popupContent += osmUrlsContent;

  const coordinates = x.lngLat;
  new maplibregl.Popup({ closeButton: true, closeOnClick: true })
    .setLngLat(coordinates)
    .setHTML(popupContent)
    .addTo(mapInstance);
}

function displayWaterwayNames(intersectingWaterways: FeatureCollection) {
  // Display all the river names in the info-container
  // extract the name and geometry from the intersectingWaterways


  const riverNames = intersectingWaterways.features
    .map((feature) => ({
      name: feature.properties.name,
      id: feature.id,
      geometry: feature.geometry,
    }))
    .filter((item) => item.name);

  const infoElement = document.getElementById("info");

  infoElement.innerHTML = `<strong>Waterways crossed: ${riverNames.length}</strong><br>`;

  // Create a separate container for the river names
  const riverNamesContainer = document.createElement("div");
  riverNamesContainer.className = "river-names-container";

  // Create a list of clickable items for each waterway name
  riverNames.forEach((item) => {
    const riverElement = document.createElement("div");
    riverElement.className = "river-name";
    riverElement.textContent = item.name;
    // Event listener when mouse enters over the element
    riverElement.addEventListener("mouseenter", () => {
      // Set line-opacity to 1 when hovered.
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: item.name },
        { selected: true }
      );
    });

    // Event listener when mouse leaves the element
    riverElement.addEventListener("mouseleave", () => {
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: item.name },
        { selected: false }
      );
    });
    // Event listener for click event to fit the map to the bounding box
    riverElement.addEventListener("click", () => {
      // Use turf to calculate the bounding box of the feature's geometry
      const routeBoundingBox = turf.bbox(item.geometry);
      fitMapToBoundingBox(routeBoundingBox);
    });

    // Append the waterway name element to the river names container
    riverNamesContainer.appendChild(riverElement);
  });

  // Append the river names container to the info container
  infoElement.appendChild(riverNamesContainer);

  infoElement.style.display = "flex";
}

function setMapCenter(pos: GeolocationPosition) {
  if (!isMapCenteredToRoute)
    mapInstance.setCenter([pos.coords.longitude, pos.coords.latitude]);
}

navigator.geolocation.getCurrentPosition(setMapCenter);
