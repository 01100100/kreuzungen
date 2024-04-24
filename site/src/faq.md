# FAQ

## How does Kruezunfen.world work?

This website uses the OpenStreetMap API to pull waterways data and then calculates the waterways crossed by checking if the route intersects with any of the waterways. It uses turf.js to do the geospatial processing in your browser and maplibre-gl to visualize the results.

## Why is a waterway not showing up?

The algorithm calculates intersecting waterways by first pulling all the waterways from OpenStreetMaps and then checking if the route intersects with any of them. If the waterways are not showing up on kreuzungen.world, it might be because the waterways are not present in OpenStreetMaps.

## Why do you display waterways which are not crossed on the route?

This might happen because open street maps returns multiple rivers with the same name and one was crossed.

## How to automatically update Strava activity descriptions with waterways crossed?

You can enable Kreuzungen.world to automatically update your Strava activity descriptions by authorizing with the "Upload your activities from Kreuzungen to Strava" checkbox selected.

## How to manually update Strava activity descriptions with waterways crossed?

FEATURE COMING SOON!

## How to share this magic with freinds?

You can share the link to your activity on Kreuzungen.world with your friends by using the share control. This will encode the route into a URL and copy to to the clipboard for sharing anywhere. 