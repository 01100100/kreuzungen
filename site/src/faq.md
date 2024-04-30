## What is Kreuzungen.world?  🌍

Kreuzungen.world is this webapp! You can upload a local GPX file or fetch an activity from Strava, and then visualize which waterways your route has crossed on your runs/rides/walks.

Kreuzungen highlights the waterways you cross on your journey and displays information that you can use to enrich your knowledge of the geography that shapes your adventures.

## How does Kreuzungen work? 🛠️

1. Analyze route data
1. Fetch nearby waterways
1. Calculate intersections
1. Display results on interactive map

<!-- 
You can read more about how and why Kreuzungen came to be in the [blog post](https://0110100.github.io/kreuzungen). -->

## How to share this magic? 🤙

You can share your activity link on Kreuzungen.world with your friends using the share control.

This will save the route to Kreuzungen.world and  copy a URL to your clipboard for easy sharing with your favorite people.

## What are Strava automatic updates? 🪩

You can enable Kreuzungen to Automagically update the description of newly created activities. It will create a message like this:

---

Crossed 5 waterways 🏞️ Nile | Amazon River | Mississippi River | Danube River | Ganges | River Thames 🌐 [https://kreuzungen.world](https://kreuzungen.world) 🗺️

---

## How to enable automatic updates? 🚀

Just select the "Upload your activities from Kreuzungen to Strava" checkbox when [authorizing with Strava](https://www.strava.com/oauth/authorize?client_id=56275&response_type=code&redirect_uri=https://kreuzungen.world/index.html?exchange_token&approval_prompt=force&scope=activity:read,activity:read_all,activity:write) and this feature will be enabled.

**[ENABLE STRAVA UPDATES](https://www.strava.com/oauth/authorize?client_id=56275&response_type=code&redirect_uri=https://kreuzungen.world/index.html?exchange_token&approval_prompt=force&scope=activity:read,activity:read_all,activity:write)**

## How to disable automatic updates? ⛔

Revoke access to the Kreuzungen.world app in your [Strava settings](https://www.strava.com/settings/apps).

Kreuzungen.world will no longer be able to update your activity descriptions.

## Why is a waterway not showing up? 🤔

This could be due to the absence of the waterway you crossed in OpenStreetMaps. Kreuzungen only shows waterways in the OSM database.

## What is OpenStreetMaps? 🗺️

OpenStreetMap (OSM) is a collaborative initiative to create a free and editable map of the world. It's a community-driven project where individuals and organizations contribute to the data collection. This data is freely available for anyone to modify, download, and use. Kreuzungen.world, along with many other web projects, utilizes OSM's extensive waterways data and rich basemaps.

## How can I add a waterway? 🙋

By adding the waterway to OpenStreetMap (OSM). Follow the instructions on the [OpenStreetMap website](https://www.openstreetmap.org/) to add or edit maps.

Once the waterway is included in OpenStreetMap, it will become accessible to all OSM users and should appear on Kreuzungen.world immediately.

By doing this, you're not only enhancing your own experience but also making a valuable contribution to the global mapping community!

## Why show uncrossed waterways? 🏞️

This might happen because kreuzungen joins together waterways geometries with the same name. In the case that there are two disjoint rivers sharing a unique name and one intersects the route, both parts will be displayed on the map.

Common names like "dorfbach", "village creek" or "bach" are often used for small waterways and can be found in many places.

## What about my data? 🛡️

I take your privacy seriously and do not store any data.

All data is processed locally on your device (the one the are using right now) and nothing is sent to Kreuzungen servers.

There are two exceptions:

- Saved routes
- Automatic Strava updates

When you save a route, the data is stored on the server and can be accessed by anyone with the link. If you don't want this, share the data directly to your friend in a secure way and tell them to use Kreuzungen.world to upload the file and visualize it without saving it.

When you enable automatic updates, Kreuzungen.world stores your Strava access tokens, needed to request and update your Strava activities. This can be revoked at any through your [Strava settings](https://www.strava.com/settings/apps).

## How can I contact you? 📨

Reach out by sending an email to [info@kreuzungen.world](info@kreuzungen.world).

## Why is it called Kreuzungen? 📚

The name "Kreuzungen" is the German word for "crossings" or "intersections".

## Open Source Software 💚

Big shoutout to the open-source projects that make Kreuzungen.world possible

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [turf.js](https://turfjs.org/)
- [maplibre-gl](https://maplibre.org/)

And thanks to Strava for providing the [Strava developer API](https://developers.strava.com/docs/) with makes this integration possible.
