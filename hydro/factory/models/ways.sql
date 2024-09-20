{{
  config(
    enabled=false
  )
}}


WITH features AS (
  SELECT
    datetime,
    strava_activity_id,
    strava_owner_id,
    unnest(intersecting_waterways.features) AS feature
  FROM {{ ref('staging') }}
)

SELECT
  features.strava_activity_id,
  features.strava_owner_id,
  feature.id,
  feature.properties.name,
  feature.properties as properties,
  st_geomfromgeojson(feature.geometry) AS geom
FROM features
WHERE feature.id LIKE 'way/%'
