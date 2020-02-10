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


# Returns all eQTL data given a positional range, optionally filtering by tissue and gene_id
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


# Given a chromosome and positional range, returns the tissue with the strongest single eQTL signal,
#  along with gene symbol and gene_id. This is queried when a user enters chr:start-end directly
#  to find the best tissue and gene within the provided query.
@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/best/", methods=["GET"]
)
def best_range_query(chrom: str, start: int, end: int):
    gene_id = request.args.get("gene_id", None)
    if gene_id is None:
        url = f"https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q={gene_id}&build=GRCh38"
        omniJson = json.load(urllib.request.urlopen(url))["data"][0]
        if "gene_id" in omniJson:
            gene_id = omniJson["gene_id"]
    gene_json = model.get_gene_names_conversion()
    if chrom is not None and chrom[0:3] == "chr":
        chrom = chrom[3:]
    if chrom is not None and start is not None and end is not None:
        conn = sqlite3.connect(model.get_sig_lookup())
        with conn:
            if gene_id is None:
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
                            f"SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? ORDER BY pval LIMIT 1;",
                            ("chr" + chrom, start, end,),
                        )
                    )[
                        0
                    ]
                except IndexError:
                    abort(404)
            else:
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
                                "chr" + chrom,
                                start,
                                end,
                                gene_id.split(".")[0] + "._%",
                            ),
                        )
                    )[
                        0
                    ]
                except IndexError:
                    abort(404)
            data = {
                "chrom": sqlchrom,
                "pos": sqlpos,
                "ref": sqlref,
                "alt": sqlalt,
                "tissue": sqltissue,
                "gene_id": sqlgene_id,
                "symbol": gene_json.get(sqlgene_id.split(".")[0], ""),
            }
            results = {"data": data}
            return jsonify(results)
    else:
        abort(404)


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
