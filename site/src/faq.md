## What is Kreuzungen.world?  🌍

Kreuzungen.world is a interactive tool that shows you the waterways you cross on your latest adventure. It provides a way to learn more about the waterways you cross on your runs, rides, or walks and enriching your knowledge of the geography that shapes your adventures.

Routes can be uploaded from a GPX file or by connecting a Strava account.

The name "Kreuzungen" is the German word for "crossings" or "intersections".

## How does Kreuzungen.world work? 🛠️

This website is powered by OpenStreetMap data. The algorithm calculates intersecting waterways by first pulling all the waterways near a route from OpenStreetMaps and then checking if the route intersects with any of them before displaying them on a interactive map.

<!-- 
You can read more about how and why Kreuzungen came to be in the [blog post](https://0110100.github.io/kreuzungen). -->

## Why is a waterway not showing up? 🤔

The algorithm calculates intersecting waterways by first pulling all the waterways near a route from OpenStreetMaps and then checks if the route intersects with any of them. If the waterways are not showing up on kreuzungen.world, it might be because the waterways are not present in OpenStreetMaps.

## What is OpenStreetMaps? 🗺️

OpenStreetMap (OSM) is a collaborative project creating a map of the world. The data is collected by every type of people and organizations, and it's free for anyone to fix, update, download and use.

The numerous waterways and rich basemaps used in Kreuzungen.world, and countless other projects on the web, are possible thanks to this great project.

## How can I add a waterway to Kreuzungen.world? 🙋

You can contribute to Kreuzungen.world by adding the waterway to OpenStreetMap (OSM). Follow the instructions on the [OpenStreetMap website](https://www.openstreetmap.org/) to add or edit maps.

Once the waterway is included in OpenStreetMap, it will become accessible to all OSM users and should appear on Kreuzungen.world immediately.

By doing this, you're not only enhancing your own experience but also making a valuable contribution to the global mapping community!

## Why do you display waterways which are not crossed on the route? 🏞️

This might happen because kreuzungen joins together waterways geometries with the same name for the best processing of OSM data. In the case that there are two disjoint rivers sharing a unique name and one intersects the route, both parts will be displayed on the map.

Common names like "dorfbach", "village creek" or "bach" are often used for small waterways and can be found in many places.

## How to sync with Strava and automatically update activity descriptions with waterways crossed? 🪩

You can enable Kreuzungen.world to automatically update your Strava activity descriptions with a message like this:

---

Crossed 19 waterways 🏞️ Nile | Amazon River | Mississippi River | Danube River | Ganges | River Thames 🌐 [https://kreuzungen.world](https://kreuzungen.world) 🗺️

---

Just select the "Upload your activities from Kreuzungen to Strava" checkbox when authorizing with Strava and this feature will be enabled.

## How to disable automatic updates of Strava activity descriptions with waterways crossed? ⛔

You can disable automatic updates of Strava activity descriptions by revoking access to Kreuzungen.world in your Strava settings. Go to [https://www.strava.com/settings/apps](https://www.strava.com/settings/apps) and click on the "Revoke Access" button next to Kreuzungen.world.

## How to manually update Strava activity descriptions with waterways crossed? 🪛

FEATURE COMING SOON!

## How to share this magic with friends? 🤙

You can share your activity link on Kreuzungen.world with your friends using the share control. This will encode the route into a URL and copy it to your clipboard for easy sharing with your favorite people.

## What about my data? 🛡️

I take your privacy very seriously and therefore do not store any data. The only things stored are:

Strava access tokens, needed to request and update your Strava activities. This can be revoked at any through your [Strava settings](https://www.strava.com/settings/apps).

Saved route data, needed when you create a link to share an activity. By doing this you agree that the route is stored, anyone with the link can access the data.

## How can I contact you? 📨

You can reach out by sending an email to [info@kreuzungen.world](info@kreuzungen.world).

## Open Source Software 💚

This project would not be possible without the following open-source projects:

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [turf.js](https://turfjs.org/)
- [maplibre-gl](https://maplibre.org/)
- [node.js](https://nodejs.org/)
- [express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [webpack](https://webpack.js.org/)

And the Strava integration would not be possible without the [Strava developer API](https://developers.strava.com/docs/).
