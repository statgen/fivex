"""
API endpoints (return JSON, not HTML)
"""

import json
import sqlite3
import urllib.request

from flask import Blueprint, abort, jsonify, request

from .. import model
from .format import query_variants

api_blueprint = Blueprint("api", __name__)


@api_blueprint.route("/bestvar/<string:symbol>/", methods=["GET"])
def gene_query(symbol: str):
    """
    Given a gene, query an SQL database to find the variant with the strongest association with that gene
    """
    # Instead of querying locally, I will use omnisearch to get the relevant parameters (chrom, pos, gene_id)
    url = f"https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q={symbol}&build=GRCh38"
    omniJson = json.load(urllib.request.urlopen(url))["data"][0]
    if (
        "gene_id" in omniJson
        and "chrom" in omniJson
        and "start" in omniJson
        and "end" in omniJson
    ):
        conn = sqlite3.connect(model.get_sig_lookup())
        with conn:
            try:
                (
                    sqlgene_id,
                    sqlchrom,
                    sqlpos,
                    sqlref,
                    sqlalt,
                    sqlval,
                    sqltissue,
                ) = list(
                    conn.execute(
                        f"SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? AND gene_id LIKE ? ORDER BY pval LIMIT 1;",
                        (
                            "chr" + omniJson["chrom"],
                            omniJson["start"] - 1000000,
                            omniJson["end"] + 1000000,
                            omniJson["gene_id"].split(".")[0] + ".%",
                        ),
                    )
                )[
                    0
                ]
                data = {
                    "chrom": sqlchrom,
                    "pos": sqlpos,
                    "ref": sqlref,
                    "alt": sqlalt,
                }
                results = {"data": data}
                return jsonify(results)
            except IndexError:
                abort(404)
    else:
        abort(404)


@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/", methods=["GET"]
)
def region_query(chrom, start, end):
    """
    Fetch the data for a given region

    In its current form, this allows fetching ALL points across any gene and tissue. We may wish to revisit this
    due to performance considerations. (FIXME)
    """
    tissue = request.args.get("tissue", None)
    gene_id = request.args.get("gene_id", None)

    data = [
        res.to_dict()
        for res in query_variants(
            chrom=chrom, start=start, end=end, tissue=tissue, gene_id=gene_id
        )
    ]

    for i, item in enumerate(data):
        # TODO: This may be unnecessary when we have a proper marker or variant field
        item["id"] = i

    results = {"data": data}
    return jsonify(results)


@api_blueprint.route("/variant/<string:chrom>_<int:pos>/", methods=["GET"])
def variant_query(chrom: str, pos: int):
    """
    Fetch the data for a single variant (for a PheWAS plot)

    This can optionally filter by gene or tissue, but by default it returns all data.
    """
    tissue = request.args.get("tissue", None)
    gene_id = request.args.get("gene_id", None)

    data = [
        res.to_dict()
        for res in query_variants(chrom, pos, tissue=tissue, gene_id=gene_id)
    ]
    if not data:
        abort(404)

    for i, item in enumerate(data):
        # FIXME: replace this synthetic field with some other unqiue identifier (like a marker)
        item["id"] = i

    results = {"data": data}
    return jsonify(results)
