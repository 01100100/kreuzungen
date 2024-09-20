WITH parsed_json AS (
    SELECT
        osm_id,
        json_extract(nominatim_response, '$') AS nominatim_json
    FROM
        {{ ref("nominatim_relations") }}
)

SELECT
    osm_id,
    nominatim_json->>'$.localname' AS localname,
    nominatim_json->>'$.osm_type' AS osm_type,
    nominatim_json->>'$.category' AS category,
    nominatim_json->>'$.type' AS type,
    nominatim_json->>'$.extratags.wikidata' AS wikidata,
    nominatim_json->>'$.extratags.wikipedia' AS wikipedia,
    nominatim_json->>'$.country_code' AS country,
    CAST(nominatim_json->>'$.geometry.coordinates[1]' AS DOUBLE) AS latitude,
    CAST(nominatim_json->>'$.geometry.coordinates[0]' AS DOUBLE) AS longitude
FROM
    parsed_json