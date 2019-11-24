"""
API endpoints (return JSON, not HTML)
"""

from flask import Blueprint, abort, jsonify, request

from .format import query_variants

api_blueprint = Blueprint("api", __name__)


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


@api_blueprint.route("/variant/<string:chrom>-<int:pos>/", methods=["GET"])
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
