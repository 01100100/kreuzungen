import {
  Map, FullscreenControl, MapMouseEvent, MapGeoJSONFeature, Popup
} from "maplibre-gl";
import polyline from "@mapbox/polyline";
import { bbox, feature, nearestPointOnLine, point } from "@turf/turf";
import {
  FeatureCollection,
  Feature,
  LineString,
  GeoJsonProperties
} from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CustomAttributionControl,
  ShareControl,
  UploadControl,
  StravaControl,
  FAQControl,
  showInfo,
  displaySpinner,
} from "./ui";
import { calculateIntersectingWaterwaysGeojson, parseGPXToGeoJSON } from "./geo";
import { setUp } from "./initialize";


// Define global variables
export let isMapCenteredToRoute = false;
let hoveredFeatureId: string | number | null | undefined = null;
let selectedFeatureId: string | number | null | undefined = null;
export let shareableTitle = "Kreuzungen 🗺️";
export let shareableDescription =
  "Reveal the waterways that shape your adventures!";
export let shareableUrl = "https://kreuzungen.world";
export let shareableUrlEncoded = encodeURIComponent(shareableUrl);
export let currentRoute: Feature<LineString>;
export const mapInstance = createMap();

// Parse url params and check storage for strava login state
setUp();

// Get the current location and set the map center
navigator.geolocation.getCurrentPosition(setMapCenter);

// Add file upload event listener for .gpx files
const fileInput = document.getElementById("fileInput");
if (fileInput) {
  fileInput.addEventListener("change", processFileUpload, false);
}
const inputElement = document.querySelector("input");
if (inputElement) {
  inputElement.addEventListener("cancel", (evt) => {
    showInfo();
  });
}

// Set the map center to the user's current location
function setMapCenter(pos: GeolocationPosition) {
  if (!isMapCenteredToRoute) {
    console.log("Setting map center to geo location of user")
    mapInstance.setCenter([pos.coords.longitude, pos.coords.latitude]);
  }
}

// Read and parse and process a uploaded .gpx file
function processFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const selectedFile = target.files?.[0];
  if (!selectedFile) return;
  const fileReader = new FileReader();
  fileReader.readAsText(selectedFile);
  fileReader.onload = async function (e) {
    const fileContents = e.target?.result?.toString();
    if (fileContents) {
      const routeGeoJSON = await parseGPXToGeoJSON(fileContents);
      processGeojson(routeGeoJSON.features[0]);
    }
  };
}

// Process a GeoJSON object, calculate intersecting waterways and display them on the map with interactions
export async function processGeojson(
  routeGeoJSON: Feature<LineString>
) {
  clearRoute();
  addRoute(routeGeoJSON);
  displayRouteMetadata(routeGeoJSON);
  fitMapToBoundingBox(bbox(routeGeoJSON));

  displaySpinner("info");
  calculateIntersectingWaterwaysGeojson(routeGeoJSON)
    .then(intersectingWaterways => {
      if (intersectingWaterways) {
        displayIntersectingWaterways(intersectingWaterways);
        addMapInteractions()
        displayWaterwayNames(intersectingWaterways);
      }
    });
}

function createMap() {
  class ExtendedMap extends Map {
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
    maxPitch: 85,
    attributionControl: false,
  });
  const attributionControl = new CustomAttributionControl({
    compact: true,
  });

  map.addControl(attributionControl);
  map.addControl(new FullscreenControl());
  const uploadControl = new UploadControl("fileInput", processFileUpload);
  map.addControl(uploadControl, "top-right");
  const stravaControl = new StravaControl();
  map.addControl(stravaControl, "top-right");
  const shareControl = new ShareControl();
  map.addControl(shareControl, "bottom-right");
  const faqControl = new FAQControl();
  map.addControl(faqControl, "bottom-right");
  return map;
}


function clearRoute() {
  // Clear existing info and reset map state
  shareableUrl = "";
  shareableUrlEncoded = "";
  // close any open popups
  const popups = document.querySelectorAll(".mapboxgl-popup");
  popups.forEach((popup) => popup.remove());
  // Remove existing layers and sources
  if (mapInstance.getLayer("route")) {
    mapInstance.removeLayerAndSource("route");
  }
  if (mapInstance.getLayer("intersectingWaterways")) {
    mapInstance.removeLayerAndSource("intersectingWaterways");
  }
  const infoElement = document.getElementById("info");
  if (infoElement) {
    infoElement.innerHTML = "";
    infoElement.style.display = "none";
  }
}

async function addRoute(routeGeoJSON: Feature<LineString>) {
  mapInstance.addSource("route", { type: "geojson", data: routeGeoJSON });
  mapInstance.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#fc03ca", "line-width": 7 },
  });
  currentRoute = routeGeoJSON
  shareableUrl = `https://kreuzungen.world/index.html?route=${encodeURIComponent(
    polyline.fromGeoJSON(routeGeoJSON)
  )}`;
  shareableUrlEncoded = encodeURIComponent(shareableUrl);
  shareableDescription = `Check out the waterways that I crossed on my latest adventures!`;
  // TODO: add more info.. date, length km and altitude gained.
}

function displayRouteMetadata(routeGeoJSON: Feature<LineString, GeoJsonProperties>) {

  const sourceElement = document.getElementById("source");

  // minimize the attribution on a compact screen
  const attributionControl = mapInstance
    ._controls[0] as CustomAttributionControl;

  if (routeGeoJSON.properties && routeGeoJSON.properties.url) {
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
    if (sourceElement) {
      sourceElement.style.display = "block";
      sourceElement.innerHTML = `<i class="fa-solid fa-route"></i> ${routeGeoJSON.properties?.name}`;
    }
    sourceElement.appendChild(linkContainer);
  }
}

function fitMapToBoundingBox(bbox: any) {
  console.log("Fitting map to bounding box");
  mapInstance.fitBounds(bbox, { padding: 50, animate: true });
  isMapCenteredToRoute = true;
}

// Display intersecting waterways on the map, input is an array of FeatureCollections
function displayIntersectingWaterways(
  intersectingWaterways: FeatureCollection
) {
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

function nearbyFeature(e: MapMouseEvent, layer: string): any {
  // return the single closest feature to the mouse pointer, if there is none then return null
  const pixelDistance = 15;
  let nearbyFeatures = mapInstance.queryRenderedFeatures([
    [e.point.x - pixelDistance / 2, e.point.y - pixelDistance / 2],
    [e.point.x + pixelDistance / 2, e.point.y + pixelDistance / 2]
  ], { layers: [layer] });
  return { ...e, features: nearbyFeatures };
}


function addMapInteractions() {
  // TODO: improve the ui by reducing the sensitivity.
  // https://github.com/acalcutt/maplibre-gl-inspect/blob/main/lib/MaplibreInspect.js#L159C1-L176C6

  // Update selected property on click event and create a popup
  mapInstance.on("click", (e) => {
    // remove and features that are selected
    if (selectedFeatureId) {
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: selectedFeatureId },
        { selected: false }
      );
      selectedFeatureId = null;
    }

    // Create a popup for the near feature, reduce the sensitivity of selecting the feature exactly.
    const nearFeatures = nearbyFeature(e, "intersectingWaterways");
    if (nearFeatures.features.length > 0) {
      createPopUp(nearFeatures);
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: nearFeatures.features[0].id },
        { selected: true }
      );
      selectedFeatureId = nearFeatures.features[0].id;
    }

  });

  // Update selected property on mouseenter event
  mapInstance.on("mouseenter", "intersectingWaterways", (e) => {
    mapInstance.getCanvas().style.cursor = "pointer";
    hoveredFeatureId = e.features[0].id;
    mapInstance.setFeatureState(
      { source: "intersectingWaterways", id: hoveredFeatureId },
      { selected: true }
    );
  });

  // Update selected property on mouseleave event
  mapInstance.on("mouseleave", "intersectingWaterways", () => {
    mapInstance.getCanvas().style.cursor = "";
    if (selectedFeatureId === hoveredFeatureId) {
      return;
    }
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
  x: MapMouseEvent & {
    features?: MapGeoJSONFeature[];
  } & Object
) {
  const riverName = x.features[0].properties.name;
  let destination = null
  let wikipedia = null
  let wikidata = null
  let type = null
  let urls = []
  if (x.features[0].geometry.type === "MultiLineString") {
    // cheque if it has the collected property field. If it does, then use it, otherwise use the features property.
    if (!x.features[0].properties.collectedProperties) {
      console.error("No collectedProperties field found")
      destination = x.features[0].properties.destination
      wikipedia = x.features[0].properties.wikipedia
      wikidata = x.features[0].properties.wikidata
      type = x.features[0].properties.type
      urls = [x.features[0].properties.id]
    }
    else {
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
    }
  } else if (x.features[0].geometry.type === "LineString") {
    destination = x.features[0].properties.destination
    wikipedia = x.features[0].properties.wikipedia
    wikidata = x.features[0].properties.wikidata
    type = x.features[0].properties.type
    urls = [x.features[0].properties.id]
  } else {
    console.error("Unknown geometry type")
  }

  let osmUrlsContent = "";

  osmUrlsContent = `
    <br>
    <details class="osm-details">
      <summary>OSM data source</summary>
        ${urls.map((url) => `<a href="https://www.openstreetmap.org/${url}" target="_blank">https://www.openstreetmap.org/${url}</a><br>`).join("")}
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

  const p = point([x.lngLat.lng, x.lngLat.lat]);
  if (x.features && x.features.length > 0) {
    const snappedCoordinates = nearestPointOnLine((x.features[0].geometry as LineString), p);
    const [lng, lat] = snappedCoordinates.geometry.coordinates;
    new Popup({ closeButton: true, closeOnClick: true })
      .setLngLat([lng, lat])
      .setHTML(popupContent)
      .addTo(mapInstance);
  } else {
    console.error("No features found");
  }
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
      if (item.name === selectedFeatureId) {
        return;
      }
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: item.name },
        { selected: false }
      );
    });
    // Event listener for click event to fit the map to the bounding box
    riverElement.addEventListener("click", () => {
      // unset the selected feature state
      if (selectedFeatureId) {
        mapInstance.setFeatureState(
          { source: "intersectingWaterways", id: selectedFeatureId },
          { selected: false }
        );
        selectedFeatureId = null;
      }
      // Use turf to calculate the bounding box of the feature's geometry
      const routeBoundingBox = bbox(item.geometry);
      fitMapToBoundingBox(routeBoundingBox);
      // set the selected feature id to and set the feature state to selected
      selectedFeatureId = item.name;
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: item.name },
        { selected: true }
      );

    });

    // Append the waterway name element to the river names container
    riverNamesContainer.appendChild(riverElement);
  });

  // Append the river names container to the info container
  infoElement.appendChild(riverNamesContainer);

  infoElement.style.display = "flex";
}

