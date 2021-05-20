"""Test the REST APIs"""

from flask import url_for
import pytest

#####
# Smoke tests: ensure that each page of the app loads.
# This is a safeguard against forgetting to provide sample data. URLs reference example views,
# and may need to be updated if the homepage examples change
def test_loads_region(client):
    url = url_for(
        "api.region_query",
        chrom="1",
        start=108774968,
        end=109774968,
        study="GTEx",
        tissue="adipose_subcutaneous",
    )
    response = client.get(url)
    assert response.status_code == 200


def test_loads_region_bestvar(client):
    # TODO: Ideally, we'd test this endpoint in a region where specifying `gene_id` changed the best result
    url = url_for(
        "api.region_query_bestvar", chrom="1", start=108774968, end=109774968
    )
    response = client.get(url)

    assert response.status_code == 200
    content = response.get_json()
    assert content["data"]["tissue"] == "thyroid"
    assert content["data"]["study"] == "GTEx"
    assert content["data"]["symbol"] == "GSTM1"


@pytest.mark.skip("Temporarily removed this functionality (specifying a gene) from our bestvar query")
def test_loads_region_bestvar_for_gene(client):
    """What is an example of the gene id altering the query for best variant in a region?"""
    url = url_for(
        "api.region_query_bestvar",
        chrom="1",
        start=108774968,
        end=109774968,
        gene_id="ENSG00000134243",
    )
    response = client.get(url)
    assert response.status_code == 200
    content = response.get_json()
    assert content["data"]["tissue"] == "Liver"


def test_loads_variant_eqtls_by_default(client):
    url = url_for("api.variant_query", chrom="1", pos=109274968)
    assert client.get(url).status_code == 200


def test_loads_variant_sqtls_with_option(client):
    url = url_for("api.variant_query", chrom="1", pos=109274968, data_type='txrev')
    assert client.get(url).status_code == 200


def test_variant_api_rejects_invalid_option(client):
    url = url_for("api.variant_query", chrom="1", pos=109274968, data_type='somethingsomething')
    assert client.get(url).status_code == 200
