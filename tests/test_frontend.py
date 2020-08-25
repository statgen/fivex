"""
Test frontend HTML views
"""
from flask import url_for


#####
# Smoke tests: ensure that each page of the app loads.
# This is a safeguard against forgetting to provide sample data. URLs reference example views,
# and may need to be updated if the homepage examples change
def test_loads_region(client):
    url = url_for(
        "frontend.region_view", chrom="1", start=108774968, end=109774968
    )
    assert client.get(url).status_code == 200


def test_loads_variant(client):
    url = url_for("frontend.variant_view", chrom="1", pos=109274968)
    assert client.get(url).status_code == 200


####
# Test specific, intended view behaviors
def test_region_must_provide_query_params(client):
    url = url_for("frontend.region_view")
    assert client.get(url).status_code == 400
