{% macro get_nominatim_relation(osm_id) %}
    {% set url = "https://nominatim.openstreetmap.org/details?osmtype=R&osmid=" ~ osm_id ~ "&format=json" %}
    {% set query = "SELECT * FROM read_json_objects('" ~ url ~ "')" %}
    {% set response = run_query(query) %}
    {{ return(response) }}
{% endmacro %}