import maplibregl from "maplibre-gl";
import {
  mapInstance,
  shareableUrl,
  shareableDescription,
  shareableTitle,
  shareableUrlEncoded,
  processGeojson,
} from "./main";
import { feature } from "@turf/helpers";
import { getStravaActivities } from "./strava";
import polyline from "@mapbox/polyline";

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

    const icon = document.createElement("i");
    icon.className = "fa fa-upload"; // Assuming you are using FontAwesome for icons
    button.appendChild(icon);

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
        showActivitiesContainer();
        this._isActivitiesDisplayed = true;
      }
    };

    const icon = document.createElement("i");
    icon.className = "fa-brands fa-strava"; // Assuming you are using FontAwesome for icons
    button.appendChild(icon);

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
        if (this._isShareExpanded) {
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
    if (urlButton) {
      urlButton.style.display = "none";
    }
    const emailButton = document.getElementById("emailButton");
    emailButton.style.display = "none";
    const whatsappButton = document.getElementById("whatsappButton");
    whatsappButton.style.display = "none";
    const twitterButton = document.getElementById("twitterButton");
    twitterButton.style.display = "none";
    const facebookButton = document.getElementById("facebookButton");
    facebookButton.style.display = "none";
    this._isShareExpanded = false;
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

export function showActivitiesContainer() {
  const activitiesContainer = document.getElementById("activities");
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
  // show loading spinner
  const activitiesList = document.getElementById("activitiesList");

  const spinnerContainer = document.getElementById("spinner");
  if (!spinnerContainer) {
    const spinnerElement = document.createElement("div");
    spinnerElement.id = "spinner";
    spinnerElement.style.textAlign = "center";
    spinnerElement.innerHTML =
      '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>';
    activitiesList.appendChild(spinnerElement);
  }

  // get activities
  let activities = await getStravaActivities(owner_access_token);
  displayActivities(activities);
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
      console.log("Activity clicked", activity);
      loadActivityOnMap(activity)
    });
    activitiesList.appendChild(activityElement);
  });

  activitiesList.style.cursor = "pointer";

  const activitiesControl = document.getElementById("activitiesControl")
  activitiesControl.innerHTML = ""


  if (activities.length > startIndex + activitiesPerPage) {
    const nextLink = document.createElement("a");
    nextLink.innerHTML = '<i class="fa-solid fa-circle-right"></i>';
    nextLink.style.float = "right";
    nextLink.style.cursor = "pointer";
    nextLink.addEventListener("click", function () {
      displayActivities(activities, startIndex + activitiesPerPage);
    });
    activitiesControl.appendChild(nextLink);
  }

  if (startIndex >= activitiesPerPage) {
    const prevLink = document.createElement("a");
    prevLink.innerHTML = '<i class="fa-solid fa-circle-left"></i>';
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
    "text-white bg-gradient-to-r from-pink-500 to-orange-400 hover:bg-gradient-to-l focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 px-1 py-1";
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
  const activitiesContainer = document.getElementById("activities");
  if (activitiesContainer) {
    activitiesContainer.style.display = "none";
  }
  const geojson = feature(polyline.toGeoJSON(activity.map.summary_polyline));
  geojson.properties = {
    name: activity.name,
    url: `https://www.strava.com/activities/${activity.id}`,
  };
  processGeojson(geojson);
}
