{{
config(
    materialized='external',
    )
}}

SELECT
  cc.name as country,
  nom.country as country_code_2,
  cc."alpha-2" as "alpha-2",
  cc."alpha-3" as country_code_3,
  cc.region as region,
  cc."sub-region" as subregion,
  COALESCE(count(rel.osm_id), 0) as waterways_crossed,
  COALESCE(count(DISTINCT nom.osm_id), 0) as unique_waterways_crossed,
  mode() WITHIN GROUP (ORDER BY nom.localname) as most_popular_waterway,
  mode() WITHIN GROUP (ORDER BY rel.strava_activity_id) as most_active_river_crosser
FROM {{ ref("nominatim_parsed" ) }} AS nom
RIGHT JOIN {{ source("external", "country_codes") }} AS cc
  ON UPPER(nom.country) = cc."alpha-2"
LEFT JOIN {{ ref("relations") }} AS rel
  ON nom.osm_id = rel.osm_id
GROUP BY cc.name, nom.country, "alpha-2", cc.region, cc."alpha-3", cc."sub-region"