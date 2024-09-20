WITH raw_data AS (
  -- Use DISTINCT to deduplicate events
  SELECT DISTINCT *
  FROM {{ source('kreuzungen', 'raw_waterways') }}
)

SELECT
  raw_data.datetime,
  raw_data.strava_activity_id,
  raw_data.strava_owner_id,
  raw_data.polyline,
  raw_data.intersecting_waterways,
  length(intersecting_waterways.features) AS crossings
FROM raw_data
