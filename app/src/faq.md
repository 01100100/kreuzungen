## What is Kreuzungen.world?  🌍

Kreuzungen.world is this webapp! You can upload a local GPX file or fetch an activity from Strava, and it will visualize which waterways you crossed on your runs, rides, paragliding trip, or any other activity you can think of.

Kreuzungen highlights the waterways you cross on your journey and displays information that you can use to enrich your knowledge of the geography that shapes your adventures.

## How does Kreuzungen work? 🛠️

1. Analyze route data.
1. Fetch nearby waterways.
1. Calculate intersections.
1. Display results on interactive map.

<!-- You can read more about how and why Kreuzungen came to be in the [blog post](https://0110100.github.io/kreuzungen). -->

## How to share this magic? 🤙

You can share your activities on Kreuzungen.world with your friends using the share button.

This saves your route to Kreuzungen.world and copies a URL to your clipboard to share with your favorite people.

## What are Strava automatic updates? 🪩

You can enable Kreuzungen to Automagically update the description of newly created activities. The updated description will look something like this:

---

Crossed 5 waterways 🏞️ Nile | Amazon River | Mississippi River | Danube River | Ganges | River Thames 🌐 Powered by Kreuzungen World 🗺️

---

## How to enable automatic updates? 🚀

Just select the "Upload your activities from Kreuzungen to Strava" checkbox when [authorizing with Strava](https://www.strava.com/oauth/authorize?client_id=56275&response_type=code&redirect_uri=https://kreuzungen.world/index.html?exchange_token&approval_prompt=force&scope=activity:read,activity:read_all,activity:write) and this feature will be enabled.

**[ENABLE STRAVA UPDATES](https://www.strava.com/oauth/authorize?client_id=56275&response_type=code&redirect_uri=https://kreuzungen.world/index.html?exchange_token&approval_prompt=force&scope=activity:read,activity:read_all,activity:write)**

## How to manually update a Strava activity 🪄

Once authorized, load a route with the strava button and click the `Update description on Strava` link in the bottom left corner.

## How to disable automatic updates? ⛔

Revoke access to the Kreuzungen.world app in your [Strava settings](https://www.strava.com/settings/apps).

Kreuzungen.world will no longer be able to update your activity descriptions.

## Why is a waterway not showing up? 🤔

This could be due to the absence of the waterway you crossed in OpenStreetMaps. Kreuzungen only shows waterways in the OSM database.

If you're using a route from Strava, kreuzungen will respect your privacy settings and ignore parts of the activity that are hidden. Any waterways that are crossed in these hidden parts will not be displayed or listed.

Otherwise, you might have not fully crossed the waterway. Time to go back and finish the job!

## What is OpenStreetMaps? 🗺️

OpenStreetMap (OSM) is a collaborative initiative to create a free and editable map of the world. It's a community-driven project where individuals and organizations contribute to the data collection. This data is freely available for anyone to modify, download, and use. Kreuzungen.world, along with many other web projects, utilizes OSM's extensive waterways data and rich basemaps.

## How can I add a waterway? 🙋

Follow the instructions on the [OpenStreetMap website](https://www.openstreetmap.org/) to add or edit a waterway.

Once the waterway is included in OpenStreetMap, it will become accessible to all OSM users and should appear on Kreuzungen.world immediately.

By doing this, you're not only enhancing your own experience but also making a valuable contribution to the global mapping community!

## Why show uncrossed waterways? 🏞️

This might happen because Kreuzungen.world joins together all waterway geometries with the same name. In the case that there are multiple disjoint waterways sharing a unique name and one intersects the route, all parts will be displayed on the map.

Common names like "village creek", "spring", "dorfbach" or "bach" are often used for small waterways and can be found in many places.

## What about my data? 🛡️

All data is processed locally on your device (the one the are using right now) and nothing is sent to Kreuzungen servers.

There are two exceptions:

- Saved routes
- Automatic Strava updates

**Saved Routes:** When you save a route, the data is stored on our server and can be accessed by anyone with the link. If you prefer to keep this information private and you're using a desktop device, you can use the URL-copy button that appears when you click the share button. This action copies a *lennnngthy* link to your clipboard, which contains the GPS data. This link is not shared with Kreuzungen's servers and can be securely shared with your friends. If they are using whatsapp to open the link, they should unfold it first to get the full route.

**Automatic Strava Updates:** If you enable automatic updates, Kreuzungen.world stores your Strava access tokens, which are necessary to request and update your Strava activities. You can revoke this access at any time through your [Strava settings](https://www.strava.com/settings/apps).

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
