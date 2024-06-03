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
poetry run python src/auth.py
```

## Deployment

### Frontend - GitHub Pages

The site is hosted using [GitHub Pages](https://pages.github.com/). A GitHub action bundles the site and deploys all content in the `app/dist` subdir for the `main` branch.

The site gets deployed to [https://kreuzungen.world](https://kreuzungen.world).

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

### Analytics - Fly.io

[Umami](https://umami.is/) is used to track anonymized usage data. This is hosted on [fly.io](https://fly.io) along with a Postgres instance for persistent storage.

Note: The Fly app name is `umami` and the Postgres instance is called `elefant`.

The deployment can be managed using the `fly` CLI.

```bash
# Ensure you set the correct values in the .env file
source .env
cd analytics/
fly secrets set APP_SECRET=$APP_SECRET
fly secrets set DATABASE_URL=$DATABASE_URL
fly deploy
```

There is a Postgres instance deployed on [fly.io](https://fly.io). To backup the database to a local file, run the following command:

```bash
fly proxy 15432:5433 -a elefant
pg_dump -p 15432 -h localhost -U umani -c -d umani -f db_backup
```

To restore the database from a local file, run the following command:

```bash
source .env
fly proxy 15432:5433 -a elefant
pg_restore -v -d postgresql://postgres:${PG_PASSWORD}@localhost:15432/myapp < db_backup
```

## Shoutouts

Thanks to Oliver Gladfelter ([cultureplot.com](https://cultureplot.com)) for inspiring me with his [Strava auth implementation](https://github.com/OGladfelter/strava-dashboard/blob/main/js/strava_api.js) and allowing me to use it in this project.
