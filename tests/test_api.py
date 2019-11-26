"""Test the REST APIs"""

from flask import url_for


#####
# Smoke tests: ensure that each page of the app loads.
# This is a safeguard against forgetting to provide sample data. URLs reference example views,
# and may need to be updated if the homepage examples change
def test_loads_region(client):
    url = url_for("api.region_query", chrom="19", start=448506, end=528506)
    assert client.get(url).status_code == 200


def test_loads_variant(client):
    url = url_for("api.variant_query", chrom="19", pos=6718376)
    assert client.get(url).status_code == 200
