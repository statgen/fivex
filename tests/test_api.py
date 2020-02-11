"""Test the REST APIs"""

from flask import url_for


#####
# Smoke tests: ensure that each page of the app loads.
# This is a safeguard against forgetting to provide sample data. URLs reference example views,
# and may need to be updated if the homepage examples change
def test_loads_region(client):
    url = url_for("api.region_query", chrom="19", start=448506, end=528506)
    assert client.get(url).status_code == 200


def test_loads_region_bestvar(client):
    # TODO: Ideally, we'd test this endpoint in a region where specifying `gene_id` changed the best result
    url = url_for("api.region_query_bestvar", chrom="19", start=1, end=960996)
    response = client.get(url)

    assert response.status_code == 200
    content = response.get_json()
    assert content["data"]["tissue"] == "Thyroid"


def test_loads_region_bestvar_for_gene(client):
    """What is an example of the gene id altering the query for best variant in a region?"""
    url = url_for(
        "api.region_query_bestvar",
        chrom="19",
        start=1,
        end=960996,
        gene_id="ENSG00000129946.10",
    )
    response = client.get(url)
    assert response.status_code == 200
    content = response.get_json()
    assert content["data"]["tissue"] == "Thyroid"


def test_loads_variant(client):
    url = url_for("api.variant_query", chrom="19", pos=6718376)
    assert client.get(url).status_code == 200
