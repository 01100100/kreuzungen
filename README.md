# Kreuzungen 💻🚴‍♂️🌍

**[https://kreuzungen.world](https://kreuzungen.world)**

![Screenshot](https://kreuzungen.world/img/screenshot.png)

Kreuzungen is a web application that allows users to upload a local GPX file or fetch an activity from Strava and visualize which waterways their route has crossed. It provides an interactive map for users to explore their journey in detail, highlighting the rivers and streams they've encountered.

## Features

- Upload `.gpx` files directly from your device.
- Display routes on an interactive map.
- Highlight all the waterways crossed during the tour.
- Integration with Strava to fetch activities.
- Information about each crossed waterway accessible through map interaction.
- Share routes with a url containing the encoded data.
- Automatically updates Strava activities.

## Powered By Open Data

The application heavily relies on open data from [OpenStreetMap](https://www.openstreetmap.org/about).

## External Libraries and Resources

Kreuzungen uses several external libraries and resources:

- **[maplibregl](https://maplibre.org/)** for rendering interactive maps
- **[turf](https://turfjs.org/)** for spatial analysis
- **[togeojson](https://github.com/mapbox/togeojson)** for converting GPX data to GeoJSON
- **[osmtogeojson](https://github.com/tyrasd/osmtogeojson)** for converting OpenStreetMap data to GeoJSON
- **[FontAwesome](https://fontawesome.com/)** for icons
- **[Strava API](https://developers.strava.com/)** for syncing Strava activities

## Development

### Project Structure

If you want to add custom features, you can edit the following files:

- `auth/`: Backend auth service to facilitate Strava Oauth flow.
- `site/`: Frontend and Webhook service.
- `.github/`: CI
- `.env`:  

### Frontend

To locally serve the frontend, change into the `site/` directory install the requirements and run a development server

```bash
cd site/
npm install
npm run serve
```

The site should now be served on [`http://localhost:8080/`](http://localhost:8080/)

To bundle the frontend, change into the `site/` directory and run the build command

```bash
cd site
npm install
npm run build
```

### Webhook Service

There is a webhook service that listens to events from Strava and updates activity descriptions automatically.

This is defined in `site/src/ap.ts` and shares code with the frontend.

To compile the typscript code into `.js` to be ran with node, you can run the command

```bash
cd site
npm install
npm run compile
```

### Backend - auth server

To locally serve the auth Backend, ensure the python env is setup and run `src/auth.py`:

```bash
# Ensure you set the correct values in the .env file and `poetry install` has been done.
source .env
poetry shell
python3 src/auth.py
```

## Deployment

### Frontend - Github pages

The site is served using github pages. There is a github action in bundle the site together and serve all content in the `site/dist` subdir for the `main` branch.

The site gets deployed to [https://kreuzungen.world](https://kreuzungen.world).

### Auth Backend - fly.io

The python auth backend is hosted on fly.io. There is a github action in place to deploy the backend for the `main` branch in `.github/workflows/deply-webhooks-service`.

Note: variables stored in the `.env` file must be set as fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
fly secrets set FRONTEND_HOST_URL=$FRONTEND_HOST_URL
fly secrets set STRAVA_API_CLIENT_SECRET=$STRAVA_API_CLIENT_SECRET
fly secrets set STRAVA_CLIENT_ID=$STRAVA_CLIENT_ID
fly secrets set REDIS_URL=$REDIS_URL
```

## Strava Webhook Service - fly.io

The node service is hosted on fly.io. There is a github action in place to build and deploy the app for the `main` branch in `.github/workflows/deply-webhooks-service`.

Note: variables stored in the `.env` file must be set as fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
fly secrets set REDIS_URL=$REDIS_URL
```

## Shout outs

Thanks to Oliver Gladfelter ([cultureplot.com](https://cultureplot.com)) for inspiring me with his [strava auth implementation](https://github.com/OGladfelter/strava-dashboard/blob/main/js/strava_api.js) and allowing me to use it in this project.
