import maplibregl from "maplibre-gl";
import osmtogeojson from "osmtogeojson";
import polyline from "@mapbox/polyline";
import * as turf from "@turf/turf";
import toGeoJSON from "togeojson";

// Define global variables
let isRouteDisplayed = null;
let displayedRouteGeoJSON = null;
let isActivitiesDisplayed = null;
let isIntersectingWaterwaysDisplayed = null;
let isMapCenteredToRoute = false;
let isShareExpanded = false;
let hoveredFeatureId = null;
let isBigBbox = null;
let shareableTitle = "Kreuzungen 🗺️";
let shareableDescription = "Reveal the waterways that shape your adventures!";
let shareableUrl = "https://kreuzungen.world";
let shareableUrlEncoded = encodeURIComponent(shareableUrl);

class CustomAttributionControl extends maplibregl.AttributionControl {
  _toggleAttribution = () => {
    if (this._container.classList.contains("maplibregl-compact")) {
      if (this._container.classList.contains("maplibregl-compact-show")) {
        this._container.setAttribute("open", "");
        this._container.classList.remove("maplibregl-compact-show");
        showSourceInfo();
      } else {
        this._container.classList.add("maplibregl-compact-show");
        this._container.removeAttribute("open");
        hideSourceInfo();
      }
    }
  };

  _updateCompactMinimize = () => {
    if (this._container.classList.contains("maplibregl-compact")) {
      if (this._container.classList.contains("maplibregl-compact-show")) {
        this._container.classList.remove("maplibregl-compact-show");
        showSourceInfo();
      }
    }
  };

  onAdd(map) {
    const container = super.onAdd(map);
    container.classList.add("maplibregl-compact");
    this._map.on("mousedown", this._updateCompactMinimize);
    return container;
  }
}

class UploadControl {
  private _fileInput: HTMLElement;
  private _map: any;
  private _container: HTMLDivElement;
  constructor(fileInputId, callback) {
    this._fileInput = document.getElementById(fileInputId);
    this._fileInput.addEventListener("change", callback, false);
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "Upload File";
    button.style.backgroundColor = "#34c6eb";
    button.style.color = "white";
    button.style.borderRadius = "4px";
    button.onclick = () => {
      hideActivitiesContainer();
      hideInfo();
      // Triggering the hidden file input click event
      this._fileInput.click();
    };

    const icon = document.createElement("i");
    icon.className = "fa fa-upload"; // Assuming you are using FontAwesome for icons
    button.appendChild(icon);

    this._container.appendChild(button);

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._fileInput.removeEventListener("change", processFileUpload, false);
    this._map = undefined;
  }
}

class StravaControl {
  _map: any;
  _container: HTMLDivElement;
  constructor() {}
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "Strava activities";
    button.style.backgroundColor = "#fc4c02";
    button.style.color = "white";
    button.style.borderRadius = "4px";
    button.onclick = () => {
      // toggle the Activities-container
      if (isActivitiesDisplayed) {
        showInfo();
        hideActivitiesContainer();
        isActivitiesDisplayed = false;
      } else {
        hideInfo();
        showActivitiesContainer();
        isActivitiesDisplayed = true;
      }
    };

    const icon = document.createElement("i");
    icon.className = "fa-brands fa-strava"; // Assuming you are using FontAwesome for icons
    button.appendChild(icon);

    this._container.appendChild(button);

    // Event to hide activities-container when map is interacted with
    this._map.on("mousedown", () => {
      hideActivitiesContainer();
      isActivitiesDisplayed = false;
      showInfo();
    });

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map.off("mousedown", this.hideActivitiesContainer); // Remove the event listener
    this._map = undefined;
  }
  hideActivitiesContainer(arg0: string, hideActivitiesContainer: any) {
    throw new Error("Method not implemented.");
  }
}
class ShareControl {
  _map: any;
  _container: HTMLDivElement;
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._container.style.margin = "0 10px";

    const urlButton = document.createElement("button");
    urlButton.id = "urlButton";
    urlButton.type = "button";
    urlButton.style.display = "none";
    urlButton.title = "Copy url to clipboard";
    urlButton.style.borderRadius = "4px";
    urlButton.onclick = () => {
      navigator.clipboard
        .writeText(shareableUrl)
        .then(() => {
          console.log("URL copied to clipboard: " + shareableUrl);
          const mapContainer = document.getElementById("map");
          const messageContainer = document.createElement("div");
          messageContainer.className = "url-copied-message";
          const icon = document.createElement("i");
          icon.className = "fa-solid fa-link";
          const text = document.createTextNode("URL copied to clipboard.");
          messageContainer.appendChild(icon);
          messageContainer.appendChild(text);
          mapContainer.appendChild(messageContainer);

          // Fade out the message by setting opacity to 0
          setTimeout(() => {
            messageContainer.style.opacity = "0";
            setTimeout(() => {
              mapContainer.removeChild(messageContainer);
            }, 500); // Fade out for 500 milliseconds
          }, 500); // Displayed solid for 500 milliseconds
        })
        .catch((err) => {
          console.error("Unable to copy URL to clipboard", err);
        });
    };

    const urlIcon = document.createElement("i");
    urlIcon.className = "fa-solid fa-link";
    urlButton.appendChild(urlIcon);

    const emailButton = this.createShareButton("email", "fa-solid fa-envelope");
    emailButton.addEventListener("click", () => {
      window.open(
        `
          mailto:?subject=${encodeURIComponent(
            shareableTitle
          )}%20${encodeURIComponent(
          shareableDescription
        )}&body=I%20used%20the%20website%20kreuzungen.world%20to%20explore%20the%20waterways%20that%20shaped%20my%20recent%20adventure!!%0A%0AClick%20on%20the%20url%20below%20to%20access%20the%20route%20on%20a%20map%20and%20see%20for%20yourself.%20%0A%0A${shareableUrl}`,
        "_blank"
      );
    });
    const whatsappButton = this.createShareButton(
      "whatsapp",
      "fa-brands fa-whatsapp"
    );
    whatsappButton.addEventListener("click", () => {
      // https://faq.whatsapp.com/5913398998672934
      let whatsappMessage = `${shareableDescription}.. ${shareableUrl}`;
      let whatsappShareLink = `https://wa.me/?text=${encodeURIComponent(
        whatsappMessage
      )}`;
      window.open(whatsappShareLink, "_blank");
    });
    const facebookButton = this.createShareButton(
      "facebook",
      "fa-brands fa-facebook"
    );
    facebookButton.addEventListener("click", () => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${shareableUrlEncoded}`,
        "_blank"
      );
    });
    const twitterButton = this.createShareButton(
      "twitter",
      "fa-brands fa-twitter"
    );
    // https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent
    twitterButton.addEventListener("click", () => {
      window.open(
        `https://twitter.com/intent/tweet?url=${shareableUrlEncoded}&text=${encodeURIComponent(
          shareableDescription
        )}`,
        "_blank"
      );
    });
    this._container.appendChild(urlButton);
    this._container.appendChild(emailButton);
    this._container.appendChild(whatsappButton);
    this._container.appendChild(facebookButton);
    this._container.appendChild(twitterButton);

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.title = "Share";
    shareButton.style.borderRadius = "4px";
    shareButton.onclick = () => {
      if (navigator.share) {
        navigator
          .share({
            title: shareableTitle,
            url: shareableUrl,
            text: shareableDescription,
          })
          .then(() => {
            console.log("Shared!");
          })
          .catch(console.error);
      } else {
        if (isShareExpanded) {
          this.minimizeShareControl();
        } else {
          this.expandShareControl();
        }
      }
    };

    const shareIcon = document.createElement("i");
    shareIcon.className = "fa-solid fa-share-nodes"; // Assuming you are using FontAwesome for icons
    shareButton.appendChild(shareIcon);

    this._container.appendChild(shareButton);

    return this._container;
  }

  createShareButton(id, faIcon) {
    const button = document.createElement("button");
    button.id = `${id}Button`;
    button.type = "button";
    button.style.display = "none";
    button.title = id;
    button.style.borderRadius = "4px";
    const icon = document.createElement("i");
    icon.className = faIcon;
    button.appendChild(icon);
    return button;
  }

  minimizeShareControl() {
    const urlButton = document.getElementById("urlButton");
    urlButton.style.display = "none";
    const emailButton = document.getElementById("emailButton");
    emailButton.style.display = "none";
    const whatsappButton = document.getElementById("whatsappButton");
    whatsappButton.style.display = "none";
    const twitterButton = document.getElementById("twitterButton");
    twitterButton.style.display = "none";
    const facebookButton = document.getElementById("facebookButton");
    facebookButton.style.display = "none";
    isShareExpanded = false;
  }

  expandShareControl() {
    const urlButton = document.getElementById("urlButton");
    urlButton.style.display = "block";
    const emailButton = document.getElementById("emailButton");
    emailButton.style.display = "block";
    const whatsappButton = document.getElementById("whatsappButton");
    whatsappButton.style.display = "block";
    const twitterButton = document.getElementById("twitterButton");
    twitterButton.style.display = "block";
    const facebookButton = document.getElementById("facebookButton");
    facebookButton.style.display = "block";
    isShareExpanded = true;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
const bboxSizeLimit_m2 = 500000000;
const mapInstance = createMap();

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", processFileUpload, false);
document.querySelector("input").addEventListener("cancel", (evt) => {
  showInfo();
});

function hideInfo() {
  const infoContainer = document.getElementById("info");
  if (infoContainer) {
    infoContainer.style.display = "none";
  }
}

function hideSourceInfo() {
  const sourceContainer = document.getElementById("source");
  if (sourceContainer) {
    sourceContainer.style.display = "none";
  }
}

function showInfo() {
  const infoContainer = document.getElementById("info");
  infoContainer.style.display = "flex";
}

function showSourceInfo() {
  const sourceContainer = document.getElementById("source");
  if (isRouteDisplayed) {
    sourceContainer.style.display = "block";
  }
}

function hideActivitiesContainer() {
  const activitiesContainer = document.getElementById("activities");
  if (activitiesContainer) {
    activitiesContainer.style.display = "none";
  }
}

function showActivitiesContainer() {
  const activitiesContainer = document.getElementById("activities");
  activitiesContainer.style.display = "block";
}

function clearRoute() {
  // Clear existing info and reset map state
  if (isRouteDisplayed) {
    mapInstance.removeLayerAndSource("route");
    isRouteDisplayed = null;
    displayedRouteGeoJSON = null;
    shareableUrl = null;
    shareableUrlEncoded = null;
  }
  if (isIntersectingWaterwaysDisplayed) {
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

  const fileReader = new FileReader();
  fileReader.readAsText(selectedFile);
  fileReader.onload = async function (e) {
    const fileContents = e.target.result;
    const routeGeoJSON = await parseGPXToGeoJSON(fileContents);
    processGeojson(routeGeoJSON.features[0]);
  };
}

export async function processGeojson(routeGeoJSON) {
  clearRoute();
  addRoute(routeGeoJSON);

  const routeBoundingBox = turf.bbox(routeGeoJSON);
  fitMapToBoundingBox(routeBoundingBox);

  isBigBbox = turf.area(turf.bboxPolygon(routeBoundingBox)) > bboxSizeLimit_m2;

  displaySpinner("info");
  const waterwaysData = await fetchWaterways(routeBoundingBox);
  const waterwaysGeoJSON = parseOSMToGeoJSON(waterwaysData);
  let intersectingWaterways = {};
  if (!isBigBbox) {
    intersectingWaterways = filterIntersectingWaterways(
      combineGeometriesForFeaturesWithTheSameName(waterwaysGeoJSON),
      routeGeoJSON
    );
  } else {
    intersectingWaterways = filterIntersectingWaterways(
      waterwaysGeoJSON,
      routeGeoJSON
    );
  }

  displayWaterwayNames(intersectingWaterways);
  displayIntersectingWaterways(intersectingWaterways);
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

async function parseGPXToGeoJSON(contents) {
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

async function fetchWaterways(bbox) {
  const waterwaysQuery = isBigBbox
    ? `rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out geom;`
    : `(rel["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way["waterway"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});)->._;out geom;`;

  const response = await fetch("https://www.overpass-api.de/api/interpreter?", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: waterwaysQuery,
  });
  return await response.text();
}

function combineGeometriesForFeaturesWithTheSameName(featureCollection) {
  const uniqueFeatures = {};

  featureCollection.features.forEach((feature) => {
    if (feature.properties && feature.properties.name) {
      const name = feature.properties.name;
      if (!uniqueFeatures[name]) {
        uniqueFeatures[name] = [];
      }
      uniqueFeatures[name].push(feature);
    }
  });

  const featuresArray = Object.entries(uniqueFeatures).map(
    ([name, features]) => {
      if ((features as any[]).length === 1) {
        return features[0];
      } else {
        const combinedGeometry = turf.combine(
          turf.featureCollection(features as any)
        );
        const collectedProperties = [
          ...new Set((features as any[]).map((f) => f.properties)),
        ];
        const relationProperties =
          collectedProperties.find(
            (prop) => prop.id && prop.id.startsWith("relation/")
          ) || {};

        // Create a combined feature with properties from the 'relation/' where applicable
        const combinedFeature = {
          type: "Feature",
          properties: {
            ...relationProperties,
            id: `combined/${collectedProperties
              .map((prop) => prop.id.replace("way/", ""))
              .join("_")}`,
            name: name,
          },
          geometry: combinedGeometry.features[0].geometry,
        };

        return combinedFeature;
      }
    }
  );

  return turf.featureCollection(featuresArray);
}

function parseOSMToGeoJSON(osmData) {
  const dom = new DOMParser().parseFromString(osmData, "text/xml");
  return osmtogeojson(dom);
}

function filterIntersectingWaterways(waterwaysGeoJSON, routeGeoJSON) {
  return waterwaysGeoJSON.features.filter((feature) =>
    turf.booleanIntersects(feature, routeGeoJSON)
  );
}

function displayIntersectingWaterways(intersectingWaterways) {
  mapInstance.addSource("intersectingWaterways", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: intersectingWaterways,
    },
    promoteId: "id",
  });
  isIntersectingWaterwaysDisplayed = true;

  mapInstance.addLayer({
    id: "intersectingWaterways",
    type: "line",
    source: "intersectingWaterways",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#0080ff",
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        0.6,
      ],
      "line-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        6,
        4,
      ],
    },
  });

  // Show popup on click
  // TODO: improve the ui by reducing the sensitivity.
  // https://github.com/acalcutt/maplibre-gl-inspect/blob/main/lib/MaplibreInspect.js#L159C1-L176C6
  mapInstance.on("click", "intersectingWaterways", (e) => {
    const riverName = e.features[0].properties.name;
    const destination = e.features[0].properties.destination || "";
    const wikipedia = e.features[0].properties.wikipedia || "";
    const wikidata = e.features[0].properties.wikidata || "";
    const type = e.features[0].properties.type || "";

    let osmUrlsContent = "";

    // if MultiLineString/combined way then output a url for all way parts
    if (e.features[0].properties.collectedProperties) {
      const collectedProps = JSON.parse(
        e.features[0].properties.collectedProperties
      );
      const urls = collectedProps.map((property) => {
        const id = property.id; // Assuming the 'id' field exists within the 'property' object
        return `<a href="https://www.openstreetmap.org/${id}" target="_blank">https://www.openstreetmap.org/${id}</a>`;
      });

      osmUrlsContent = `
      <br>
      <details class="osm-details">
        <summary>OSM data</summary>
        <ul>
          ${urls.map((url) => `<li>${url}</li>`).join("")}
        </ul>
      </details>
    `;
    } else {
      const osm_url = `https://www.openstreetmap.org/${e.features[0].id}`;
      osmUrlsContent = `
      <br>
      <details>
        <summary>OSM data source's</summary>
        <ul>
          ${riverName}<br><a href="${osm_url}" target="_blank">${osm_url}</a>
        </ul>
      </details>
    `;
    }

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

    const coordinates = e.lngLat;

    new maplibregl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(mapInstance);
  });

  mapInstance.on("mouseenter", "intersectingWaterways", (e) => {
    mapInstance.getCanvas().style.cursor = "pointer";
    hoveredFeatureId = e.features[0].id;
    mapInstance.setFeatureState(
      { source: "intersectingWaterways", id: hoveredFeatureId },
      { hover: true }
    );
  });

  // Hide popup on mouseleave event
  mapInstance.on("mouseleave", "intersectingWaterways", () => {
    mapInstance.getCanvas().style.cursor = "";
    if (hoveredFeatureId) {
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: hoveredFeatureId },
        { hover: false }
      );
    }
    hoveredFeatureId = null;
  });

  // Update popup location on mousemove event
  mapInstance.on("mousemove", "intersectingWaterways", (e) => {
    if (e.features.length > 0) {
      if (hoveredFeatureId) {
        mapInstance.setFeatureState(
          { source: "intersectingWaterways", id: hoveredFeatureId },
          { hover: false }
        );
      }
      hoveredFeatureId = e.features[0].id;
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: hoveredFeatureId },
        { hover: true }
      );
    }
  });
}

function displayWaterwayNames(intersectingWaterways) {
  // Display all the river names in the info-container
  const riverNames = intersectingWaterways
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
        { source: "intersectingWaterways", id: item.id },
        { hover: true }
      );
    });

    // Event listener when mouse leaves the element
    riverElement.addEventListener("mouseleave", () => {
      mapInstance.setFeatureState(
        { source: "intersectingWaterways", id: item.id },
        { hover: false }
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

function displaySpinner(id) {
  const element = document.getElementById(id);

  const spinnerContainer = document.getElementById("spinner");
  if (!spinnerContainer) {
    const spinnerElement = document.createElement("div");
    spinnerElement.id = "spinner";
    spinnerElement.style.textAlign = "center";
    spinnerElement.innerHTML =
      '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>';
    element.appendChild(spinnerElement);
  }
  showInfo();
}

function setMapCenter(pos) {
  if (!isMapCenteredToRoute)
    mapInstance.setCenter([pos.coords.longitude, pos.coords.latitude]);
}

navigator.geolocation.getCurrentPosition(setMapCenter);
