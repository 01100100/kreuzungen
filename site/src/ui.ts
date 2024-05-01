import maplibregl from "maplibre-gl";
import {
  mapInstance,
  shareableUrl,
  shareableDescription,
  shareableTitle,
  shareableUrlEncoded,
  processGeojson,
  currentRoute
} from "./main";
import { saveRoute } from "./stash";
import { feature } from "@turf/helpers";
import { getStravaActivities } from "./strava";
import polyline from "@mapbox/polyline";
import { library, icon } from "@fortawesome/fontawesome-svg-core";
import { faUpload, faQuestion, faLink, faFloppyDisk, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { faStrava } from "@fortawesome/free-brands-svg-icons";
// Add the icons to the library so you can use it in your page
library.add(faUpload, faStrava, faQuestion, faLink, faFloppyDisk, faShareNodes);

export class CustomAttributionControl extends maplibregl.AttributionControl {
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

  onAdd(map: maplibregl.Map) {
    const container = super.onAdd(map);
    container.classList.add("maplibregl-compact");
    this._map.on("mousedown", this._updateCompactMinimize);
    return container;
  }
}

export class UploadControl {
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

    const uploadIcon = icon({ prefix: 'fas', iconName: 'upload' });
    button.appendChild(uploadIcon.node[0]);

    this._container.appendChild(button);

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

export class StravaControl {
  _map: any;
  _container: HTMLDivElement;
  _isActivitiesDisplayed: boolean;
  constructor() { }
  onAdd(map) {
    this._map = map;
    this._isActivitiesDisplayed = false;
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
      if (this._isActivitiesDisplayed) {
        showInfo();
        hideActivitiesContainer();
        this._isActivitiesDisplayed = false;
      } else {
        hideInfo();
        hideFAQContainer();
        showActivitiesContainer();
        this._isActivitiesDisplayed = true;
      }
    };

    const stravaIcon = icon({ prefix: 'fab', iconName: 'strava' });
    button.appendChild(stravaIcon.node[0]);
    this._container.appendChild(button);

    // Event to hide activities-container when map is interacted with
    this._map.on("mousedown", () => {
      hideActivitiesContainer();
      this._isActivitiesDisplayed = false;
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

export class FAQControl {
  _map: any;
  _container: HTMLDivElement;
  _isFAQDisplayed: boolean;
  constructor() { }
  onAdd(map) {
    this._map = map;
    this._isFAQDisplayed = false;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.title = "FAQ's";
    button.style.borderRadius = "4px";
    button.onclick = () => {
      // toggle the FAQ-container
      if (this._isFAQDisplayed) {
        showInfo();
        showSourceInfo()
        hideFAQContainer();
        this._isFAQDisplayed = false;
      } else {
        hideInfo();
        hideSourceInfo()
        hideActivitiesContainer();
        showFAQContainer();
        this._isFAQDisplayed = true;
      }
    };

    const questionIcon = icon({ prefix: 'fas', iconName: 'question' });
    button.appendChild(questionIcon.node[0]);
    this._container.appendChild(button);

    this._container.appendChild(button);

    // Event to hide FAQ-container when map is interacted with
    this._map.on("mousedown", () => {
      hideFAQContainer();
      this._isFAQDisplayed = false;
      showInfo();
      showSourceInfo()
    });

    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

export class ShareControl {
  _map: any;
  _container: HTMLDivElement;
  _isShareExpanded: boolean;
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._container.style.margin = "0 10px";
    this._isShareExpanded = false;

    const linkButton = document.createElement("button");
    linkButton.id = "linkButton";
    linkButton.type = "button";
    linkButton.style.display = "none";
    linkButton.title = "Copy url to clipboard";
    linkButton.style.borderRadius = "4px";
    linkButton.onclick = () => {
      navigator.clipboard
        .writeText(shareableUrl)
        .then(() => {
          console.log("URL copied to clipboard: " + shareableUrl);
          flashMessage(`URL copied to clipboard: ${shareableUrl}`)
        })
        .catch((err) => {
          console.error("Unable to copy URL to clipboard", err);
        });
    };


    const linkIcon = icon({ prefix: 'fas', iconName: 'link' });
    linkButton.appendChild(linkIcon.node[0]);

    this._container.appendChild(linkButton);

    const saveButton = document.createElement("button");
    saveButton.id = "saveButton";
    saveButton.type = "button";
    saveButton.style.display = "none";
    saveButton.title = "Save route";
    saveButton.style.borderRadius = "4px";
    const floppyDiskIcon = icon({ prefix: 'fas', iconName: 'floppy-disk' });
    saveButton.appendChild(floppyDiskIcon.node[0]);
    saveButton.addEventListener("click", async () => {

      // TODO: Add a model to the screen, which displays disclaimer and a submit button, we will. store your route for you, and it will be accessible to anyone with the following URL. 

      // The URL will be copied to your clipboard, and you can share it with anyone you want.
      if (!currentRoute) {
        console.error("No route to save")
        const mapContainer = document.getElementById("map");
        const messageContainer = document.createElement("div");
        messageContainer.className = "url-copied-message";
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-link";
        const text = document.createTextNode(`Load a route first to save it.`);
        messageContainer.appendChild(icon);
        messageContainer.appendChild(text);
        mapContainer.appendChild(messageContainer);
        return
      }
      const savedRoute = await saveRoute(currentRoute)
      const savedURL = savedRoute.url
      navigator.clipboard
        .writeText(savedURL)
        .then(() => {
          console.log("Route save and URL copied to clipboard: " + savedURL);
          const mapContainer = document.getElementById("map");
          const messageContainer = document.createElement("div");
          messageContainer.className = "url-copied-message";
          const icon = document.createElement("i");
          icon.className = "fa-solid fa-link";
          const text = document.createTextNode(`Route save and URL copied to clipboard: ${savedURL}`);
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


    });
    this._container.appendChild(linkButton);
    this._container.appendChild(saveButton);

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.title = "Share";
    shareButton.style.borderRadius = "4px";
    shareButton.onclick = async () => {
      if (navigator.share) {
        // TODO: ask user for permission to save and share via url
        const savedRoute = await saveRoute(currentRoute)
        const savedURL = savedRoute.url
        navigator
          .share({
            title: shareableTitle,
            url: savedURL,
            text: shareableDescription,
          })
          .then(() => {
            console.log("Shared!");
          })
          .catch(console.error);
      } else {
        if (this._isShareExpanded) {
          this.minimizeShareControl();
        } else {
          this.expandShareControl();
        }
      }
    };

    const shareIcon = icon({ prefix: 'fas', iconName: 'share-nodes' });
    shareButton.appendChild(shareIcon.node[0]);
    this._container.appendChild(shareButton);

    return this._container;
  }


  minimizeShareControl() {
    const linkButton = document.getElementById("linkButton");
    if (linkButton) {
      linkButton.style.display = "none";
    }
    const saveButton = document.getElementById("saveButton");
    saveButton.style.display = "none";
    this._isShareExpanded = false;
  }

  expandShareControl() {
    const linkButton = document.getElementById("linkButton");
    linkButton.style.display = "block";
    const saveButton = document.getElementById("saveButton");
    saveButton.style.display = "block";
    this._isShareExpanded = true;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

export function hideInfo() {
  const infoContainer = document.getElementById("info");
  if (infoContainer) {
    infoContainer.style.display = "none";
  }
}

export function hideSourceInfo() {
  const sourceContainer = document.getElementById("source");
  if (sourceContainer) {
    sourceContainer.style.display = "none";
  }
}

export function showInfo() {
  const infoContainer = document.getElementById("info");
  infoContainer.style.display = "flex";
}

export function showSourceInfo() {
  const sourceContainer = document.getElementById("source");
  if (mapInstance.isSourceLoaded("route")) {
    sourceContainer.style.display = "block";
  }
}

export function hideActivitiesContainer() {
  const activitiesContainer = document.getElementById("activities");
  if (activitiesContainer) {
    activitiesContainer.style.display = "none";
  }
}

export function hideFAQContainer() {
  const faqContainer = document.getElementById("faq");
  if (faqContainer) {
    faqContainer.style.display = "none";
  }
}

export function showActivitiesContainer() {
  const activitiesContainer = document.getElementById("activities");
  activitiesContainer.style.display = "block";
}

export function showFAQContainer() {
  const activitiesContainer = document.getElementById("faq");
  activitiesContainer.style.display = "block";
}

export function displaySpinner(id) {
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

export async function loadStravaActivities(owner_access_token: string) {
  displaySpinner("activitiesList");
  getStravaActivities(owner_access_token).then((activities) => {
    if (activities) {
      displayActivities(activities);
    }
  });
}

function displayActivities(activities: any[], startIndex: number = 0) {
  const activitiesPerPage = 5;
  const currentPageActivities = activities.slice(
    startIndex,
    startIndex + activitiesPerPage
  );
  const activitiesList = document.getElementById("activitiesList");
  activitiesList.style.width = "250px";
  activitiesList.innerHTML = "";

  currentPageActivities.forEach(function (activity) {
    const activityElement = createActivityElement(activity);
    activityElement.addEventListener("click", function () {
      console.log("Activity clicked: ", activity.name);
      loadActivityOnMap(activity)
    });
    activitiesList.appendChild(activityElement);
  });

  activitiesList.style.cursor = "pointer";

  const activitiesControl = document.getElementById("activitiesControl")
  activitiesControl.innerHTML = ""
  activitiesControl.style.paddingTop = "8px"


  if (activities.length > startIndex + activitiesPerPage) {
    const nextLink = document.createElement("a");
    nextLink.innerHTML = '<i class="fa-solid fa-circle-right fa-2xl"></i>';
    nextLink.style.float = "right";
    nextLink.style.cursor = "pointer";
    nextLink.addEventListener("click", function () {
      displayActivities(activities, startIndex + activitiesPerPage);
    });
    activitiesControl.appendChild(nextLink);
  }

  if (startIndex >= activitiesPerPage) {
    const prevLink = document.createElement("a");
    prevLink.innerHTML = '<i class="fa-solid fa-circle-left fa-2xl"></i>';
    prevLink.style.float = "right";
    prevLink.style.cursor = "pointer";
    prevLink.style.paddingRight = "5px"
    prevLink.addEventListener("click", function () {
      displayActivities(activities, startIndex - activitiesPerPage);
    });
    activitiesControl.appendChild(prevLink);
  }



}


function createActivityElement(activity) {
  const activityElement = document.createElement("div");
  activityElement.className =
    "activity-item";
  activityElement.style.display = "flex";
  activityElement.style.flexDirection = "column";
  activityElement.style.marginBottom = "3px";
  activityElement.style.borderRadius = "3px";
  const nameElement = document.createElement("div");
  nameElement.innerHTML = activity.name;
  nameElement.style.fontWeight = "bold";
  nameElement.style.whiteSpace = "nowrap";
  nameElement.style.overflow = "hidden";
  nameElement.style.textOverflow = "ellipsis";
  nameElement.style.maxWidth = "100%";
  activityElement.appendChild(nameElement);

  const detailsElement = document.createElement("div");
  detailsElement.style.display = "flex";
  detailsElement.style.justifyContent = "space-between";
  activityElement.appendChild(detailsElement);

  const distanceElement = document.createElement("div");
  distanceElement.innerHTML = (activity.distance / 1000).toFixed(2) + " km";
  detailsElement.appendChild(distanceElement);

  const dateElement = document.createElement("div");
  const date = new Date(activity.start_date);
  const formattedDate = date.toISOString().split("T")[0];
  dateElement.innerHTML = formattedDate;
  detailsElement.appendChild(dateElement);

  return activityElement;
}

function loadActivityOnMap(activity) {
  hideActivitiesContainer();
  const geojson = feature(polyline.toGeoJSON(activity.map.summary_polyline));
  geojson.properties = {
    name: activity.name,
    url: `https://www.strava.com/activities/${activity.id}`,
  };
  processGeojson(geojson, true, activity.id);
}

export function flashMessage(html: string) {
  const mapContainer = document.getElementById("map");
  const messageContainer = document.createElement("div");
  messageContainer.className = "flash-message";
  messageContainer.innerHTML = html;
  mapContainer.appendChild(messageContainer);

  // TODO: be careful not to do multiple times and decrease opacity

  // Fade out the message by setting opacity to 0
  setTimeout(() => {
    messageContainer.style.opacity = "0";
    setTimeout(() => {
      mapContainer.removeChild(messageContainer);
    }, 2000); // Fade out for 500 milliseconds
  }, 1500); // Displayed solid for 500 milliseconds
}
