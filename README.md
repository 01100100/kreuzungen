# Kreuzungen 💻🚴🌍

**[https://kreuzungen.world](https://kreuzungen.world)**

![Screenshot](app/src/assets/screenshot.png)

Kreuzungen is a web application that allows users to upload a local `GPX` file or fetch an activity from Strava and then visualize which waterways their route has crossed. It provides an interactive map for users to explore their journey in detail, highlighting the rivers and streams they've encountered.

## Features

- Upload a `.gpx` file directly from a device.
- Integration with Strava to fetch activities.
- Visualize routes on an interactive map.
- Highlight all the waterways crossed during the journey.
- Access information about each crossed waterway through map interaction.
- Share routes with a URL containing the encoded data or save a route with a short friendly name.
- Automatically update Strava activities with a message about the waterways crossed.

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
- **[Redis](https://redis.io/)** for key-value storage
- **[Webpack](https://webpack.js.org/)** for bundling assets
- **[Jest](https://jestjs.io/)** for testing
- **[Umami](https://umami.is/)** for privacy-focused analytics
- **[Postgres](https://www.postgresql.org/)** for storing analytics data

## Development

### Project Structure

The project is structured as follows:

- `app/`: Webapp and Strava webhook service.
- `auth/`: Backend auth service to facilitate Strava OAuth flow.
- `analytics/`: [Umami](https://umami.is/) deployment config.
- `.github/`: CI config.
- `.env`: Variables to be set as secrets.

### Frontend

To serve the webapp frontend locally, navigate to the `app/` directory, install the requirements, and run a development server:

```bash
cd app/
npm install
npm run serve
```

The site should now be served on [`http://localhost:8080/`](http://localhost:8080/)

To bundle the frontend, change into the `app/` directory and run the build command:

```bash
cd app
npm install
npm run build
```

The project is set up with some basic tests using `jest`. To run the tests use the command:

```bash
cd app
npm install --save-dev
npm run test
```

### Webhook Service

The webhook service listens to events from Strava and updates newly created activity descriptions automatically.

This is defined in `app/src/app.ts` and shares code with the frontend.

To compile the TypeScript code into `.js` to be run with Node locally, you can run the command:

```bash
cd app
npm install
npm run compile
```

To run the compiled service locally, you can run the command:

```bash
cd app
sudo node dist/app.js
```

### Backend - Auth Server

To locally serve the auth backend, ensure the Python environment is set up and run `src/auth.py`:

```bash
source .env
cd auth/
poetry install
source $(poetry env info --path)/bin/activate
python src/auth.py
```

## Deployment

### Frontend - GitHub Pages

The site is hosted using [GitHub Pages](https://pages.github.com/). A GitHub action tests the code, bundles the site and deploys all content in the `app/dist` subdir for the `main` branch.

DNS records are set up, such the that the site is served from [https://kreuzungen.world](https://kreuzungen.world).

### Auth Backend - Fly.io

The Python auth backend is hosted on [fly.io](https://fly.io). A GitHub action deploys the backend for the `main` branch.

Note: Variables stored in the `.env` file must be set as Fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
cd auth/
fly secrets set FRONTEND_HOST_URL=$FRONTEND_HOST_URL
fly secrets set STRAVA_API_CLIENT_SECRET=$STRAVA_API_CLIENT_SECRET
fly secrets set STRAVA_CLIENT_ID=$STRAVA_CLIENT_ID
fly secrets set REDIS_URL=$REDIS_URL
fly secrets set APP_SECRET=$APP_SECRET
```

### Strava Webhook Service - Fly.io

The Node service is hosted on [fly.io](https://fly.io). A GitHub action will build and deploy the app for the `main` branch.

Note: Variables stored in the `.env` file must be set as Fly secrets.

```bash
# Ensure you set the correct values in the .env file
source .env
cd app/
fly secrets set REDIS_URL=$REDIS_URL
```

### Analytics

The site uses [Umami](https://umami.is/) for privacy-focused analytics.

An instance is hosted on [fly.io](https://fly.io). The configuration is defined in the [analytics](https://github.com/01100100/analytics) repository.

A DNS record is set up such that the `stats.kreuzungen.world` subdomain points to the Umami instance.

The analytics script is available at [https://stats.kreuzungen.world/script.js](https://stats.kreuzungen.world/script.js), which is downloaded and stored in this repository in `src/assets/analytics.js`.

Webpack is configured to include the analytics script in the build and it is used in the `index.html` file.

To update the script, run the following command:

```bash
curl https://stats.kreuzungen.world/script.js -o src/assets/analytics.js
```

## Shoutouts

Thanks to Oliver Gladfelter ([cultureplot.com](https://cultureplot.com)) for inspiring me with his [Strava auth implementation](https://github.com/OGladfelter/strava-dashboard/blob/main/js/strava_api.js) and allowing me to use it in this project.
