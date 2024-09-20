{{
  config(
    materialized='external',
    )
}}

SELECT
  rel.strava_owner_id,
  count(rel.strava_activity_id) as count_activities,
  count(rel.osm_id) as waterways_crossed,
  count(DISTINCT nom.osm_id) as unique_waterways_crossed,
  mode() WITHIN GROUP (ORDER BY nom.localname) as most_popular_waterway,
  mode() WITHIN GROUP (ORDER BY rel.strava_activity_id) as most_active_river_crosser
FROM {{ ref("nominatim_parsed" ) }} AS nom
INNER JOIN {{ ref("relations") }} AS rel
  ON nom.osm_id = rel.osm_id
GROUP BY strava_owner_id
