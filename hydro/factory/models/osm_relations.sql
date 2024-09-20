{{
  config(
    materialized='table',
  )
}}

SELECT DISTINCT
  id,
  name,
  properties,
  geom,
  REPLACE(id, 'relation/', '') AS osm_id
FROM {{ ref('relations') }}
