strava_data = [];

///////////////////////////////////// API token setting up ///////////////////////////////////////////////////
// check for URL params
var queryString = window.location.search;
var urlParams = new URLSearchParams(queryString);
// search local storage for a possible access token
try {
    var token_exists = JSON.parse(localStorage.getItem("strava_data")).access_token != null;
    var expires_at = JSON.parse(localStorage.getItem("strava_data")).expires_at;
}
catch {
    var token_exists = false;
    var expires_at = 0;
}

if (urlParams.has('route')) {
    var route = urlParams.get('route')
    coordinates = polyline.decode(route);
    geojson =  polyline.toGeoJSON(route)
    geojson.properties = { "name":  "✨ Route shared with magic link ✨"};
    // Ensure the map style is loaded before processing the route.
    if (mapInstance.isStyleLoaded()) {
        processGeojson(geojson);
      } else {
        mapInstance.once('style.load', () => {
          processGeojson(geojson);
        });
      }
}

// 4 possible scenarios: token in local storage, expired token in local storage, no token and no oauth code, no token but oauth code
if (token_exists & (new Date().getTime() / 1000) < expires_at) { // their access token is saved in local storage and hasn't expired yet
    console.log("Token exists");

    token = JSON.parse(window.localStorage.getItem("strava_data")).access_token;
    getActivities(1);
}
else if (token_exists & (new Date().getTime() / 1000) >= expires_at) { // their access token is saved in local storage but expired
    console.log("Previous authorization detected; access token is expired");

    var refreshToken = JSON.parse(localStorage.getItem("strava_data")).refresh_token;
    reAuthorize(refreshToken);
}
else if (!urlParams.has('exchange_token') || urlParams.get('error') === 'access_denied'){ // we don't have a code. They still need to log in and authorize
    // encourage them to log in and authorize
    console.log("No token in local storage, no authorization code");
    document.getElementById("stravaConnect").style.display = "flex";
    document.getElementById("stravaPowered").style.display = "none"

}
else { // we have a code because they logged in and authorized. the code can be found in the URL params
    console.log("Authorization code retrieved");

    //check the required scopes have been approved.
    var approvedScopes = urlParams.get('scope')
    var requiredScopes = ['activity', 'activity:read_all'];

    var hasRequiredScopes = requiredScopes.some(function(scope) {
        return approvedScopes.includes(scope);
    });

    if (hasRequiredScopes) {
        var code = urlParams.get('code');
        authorize();
    } else {
        console.log('Missing required scopes');
        alert("For this app to work with strava, you need to authorize it to view activity data. Please authenticate again and authorize the app.")
        document.getElementById("stravaConnect").style.display = "flex";
        document.getElementById("stravaPowered").style.display = "none"
    }
    

}


////////////////////////////////// the functions /////////////////////////////////////////////////////////////
function authorize() {
    // use code from authorization to get user token
    fetch('https://kreuzungen.fly.dev/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `code=${code}`
    })
      .then(resp => {
        if (!resp.ok) {
          throw new Error('Request failed. Status: ' + resp.status);
        }
        return resp.json();
      })
      .then(response => {
        // save data to local storage - important for refresh token in the future for reauthorization
        localStorage.setItem('strava_data', JSON.stringify(response));
        
        // save token
        token = response.access_token;
    
        // get activities
        getActivities(1);
      })
      .catch(error => {
        console.error('Error:', error);
      });
}

function reAuthorize(refreshToken) {
    // use code from authorization to get user token
    fetch('https://kreuzungen.fly.dev/reoauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `refreshToken=${refreshToken}`
    })
      .then(resp => {
        if (!resp.ok) {
          throw new Error('Request failed. Status: ' + resp.status);
        }
        return resp.json();
      })
      .then(response => {
        // save data to local storage - update persisted access_token
        localStorage.setItem('strava_data', JSON.stringify(response));
        
        // set token
        token = response.access_token;
  
        // get activities
        getActivities(1);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

function displayActivities(pageNum) {
  const activitiesPerPage = 6;
  const startIndex = (pageNum - 1) * activitiesPerPage;
  const currentPageActivities = strava_data.slice(startIndex, startIndex + activitiesPerPage);
  const infoElement = document.getElementById("activitiesList");
  infoElement.innerHTML = "";

  currentPageActivities.forEach(function(activity) {
    const activityElement = createActivityElement(activity);
    activityElement.addEventListener("click", function() {
      loadActivityOnMap(activity);
    });
    infoElement.appendChild(activityElement);
  });

  infoElement.style.cursor = "pointer";

  if (pageNum > 1) {
    const previousLink = document.createElement("a");
    previousLink.innerHTML = '<i class="fa-solid fa-circle-left"></i>';
    previousLink.style.float = "left"
    previousLink.addEventListener("click", function() {
        displayActivities(pageNum - 1);
    });
    infoElement.appendChild(previousLink);
}

if (strava_data.length > (startIndex + activitiesPerPage)) {
    const nextLink = document.createElement("a");
    nextLink.innerHTML = '<i class="fa-solid fa-circle-right"></i>';
    nextLink.style.float = "right";
    nextLink.addEventListener("click", function() {
        displayActivities(pageNum + 1);
    });
    infoElement.appendChild(nextLink);
}
}

function createActivityElement(activity) {
  const activityElement = document.createElement("div");
  activityElement.style.display = "flex";
  activityElement.style.flexDirection = "column";
  activityElement.style.marginBottom = "10px";

  const nameElement = document.createElement("div");
  nameElement.innerHTML = activity.name;
  nameElement.style.fontWeight = "bold";
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
  const formattedDate = date.toISOString().split('T')[0];
  dateElement.innerHTML = formattedDate;
  detailsElement.appendChild(dateElement);

  return activityElement;
}

function loadActivityOnMap(activity) {
  const activitiesContainer = document.getElementById("activities");
  if (activitiesContainer) {
    activitiesContainer.style.display = 'none';
  }
  const geojson = polyline.toGeoJSON(activity.map.summary_polyline);
  geojson.properties = { "name": activity.name, "url": `https://www.strava.com/activities/${activity.id}` };
  processGeojson(geojson);
}

function getActivities(pageNum) {
    // show loading spinner
    const infoElement = document.getElementById("activitiesList");

    const spinnerContainer = document.getElementById("spinner");
    if (!spinnerContainer) {
        const spinnerElement = document.createElement("div")
        spinnerElement.id = "spinner"
        spinnerElement.style.textAlign = "center" 
        spinnerElement.innerHTML = '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>'
        infoElement.appendChild(spinnerElement)       
    }

    const activities_link = `https://www.strava.com/api/v3/activities?per_page=200&access_token=` + token + "&page=" + pageNum;
    fetch(activities_link)
    .then(response => response.json())
    .then((json) => {

        // if this page had 200 activities, then there's likely another page
        if (json.length == 200){
            strava_data = strava_data.concat(json); // save contents from this page, run another call to the next page
            getActivities(pageNum + 1); // recursion!!
        }
        else if (json.length < 200){ // we've reached the final page
            strava_data = strava_data.concat(json).filter(function(x){
                // Filter out the activities that do not have coordinates
                return x.map.summary_polyline && x.map.summary_polyline.length > 0;
            });; // save final page's activities to main data array and move on
            
            displayActivities(1)
        }
    })

}
