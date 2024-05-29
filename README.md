# Kreuzungen 💻🚴‍♂️🌍

**[https://kreuzungen.world](https://kreuzungen.world)**

![Screenshot](src/assets/screenshot.png)

Kreuzungen is a web application that allows users to upload a local GPX file or fetch an activity from Strava and visualize which waterways their route has crossed. It provides an interactive map for users to explore their journey in detail, highlighting the rivers and streams they've encountered.

## Features

- Upload `.gpx` files directly from your device.
- Visualize routes on an interactive map.
- Highlight all the waterways crossed during the journey.
- Integration with Strava to fetch activities.
- Information about each crossed waterway accessible through map interaction.
- Share routes with a url containing the encoded data or save a route with a short friendly name.
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

The project is structured as follows:

- `app/`: Webapp and webhook service.
- `auth/`: Backend auth service to facilitate Strava Oauth flow.
- `analytics/`: [Umami](https://umami.is/) deployment config.
- `.github/`: CI config.
- `.env`: variables to be set as secrets.

### Frontend

To serve the webapp frontend locally, navigate to the `app/` directory, install the requirements, and run a development server:

```bash
cd app/
npm install
npm run serve
```

The site should now be served on [`http://localhost:8080/`](http://localhost:8080/)

To bundle the frontend, change into the `app/` directory and run the build command

```bash
cd app
npm install
npm run build
```

### Webhook Service

The webhook service listens to events from Strava and updates activity descriptions automatically.

This is defined in `app/src/app.ts` and shares code with the frontend.

To compile the TypeScript code into .js to be run with Node, you can run the command:

```bash
cd app
npm install
npm run compile
```

### Backend - auth server

To locally serve the auth Backend, ensure the python environment is setup and run `src/auth.py`:

```bash
# Ensure you set the correct values in the .env file and `poetry install` has been done.
source .env
poetry shell
python3 src/auth.py
```

## Deployment

### Frontend - Github pages

The site is hosted using github pages. A Github action bundles the site together and deploys all content in the `app/dist` subdir for the `main` branch.

The site gets deployed to [https://kreuzungen.world](https://kreuzungen.world).

### Auth Backend - fly.io

The python auth backend is hosted on fly.io.  A github action deploys the backend for the `main` branch.

Note: variables stored in the `.env` file must be set as fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
cd auth/
fly secrets set FRONTEND_HOST_URL=$FRONTEND_HOST_URL
fly secrets set STRAVA_API_CLIENT_SECRET=$STRAVA_API_CLIENT_SECRET
fly secrets set STRAVA_CLIENT_ID=$STRAVA_CLIENT_ID
fly secrets set REDIS_URL=$REDIS_URL
```

## Strava Webhook Service - fly.io

The node service is hosted on fly.io. A github action will build and deploy the app for the `main` branch.

Note: variables stored in the `.env` file must be set as fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
cd app/
fly secrets set REDIS_URL=$REDIS_URL
```

## Analytics - fly.io

[Umami](https://umami.is/) is used to track anonymized usage data. This is hosted on fly.io along with a postgres instance for persistent storage.

This deployment can be managed using the `fly` cli.

```bash
# Ensure you set the correct values in the .env file
source .env
cd analytics/
fly secrets set APP_SECRET=$APP_SECRET
fly secrets set DATABASE_URL=$DATABASE_URL
fly deploy
```

## Shout outs

Thanks to Oliver Gladfelter ([cultureplot.com](https://cultureplot.com)) for inspiring me with his [strava auth implementation](https://github.com/OGladfelter/strava-dashboard/blob/main/js/strava_api.js) and allowing me to use it in this project.
