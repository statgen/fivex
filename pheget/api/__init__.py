"""
API endpoints (return JSON, not HTML)
"""

from flask import Blueprint, abort, jsonify, request

from .format import parse_position, query_variants

api_blueprint = Blueprint("api", __name__)


@api_blueprint.route("/range/", methods=["GET"])
def range_query():  # fields to get: chrom, start, end, gene_id, tissue
    """
    Fetch the data for a given region

    In its current form, this allows fetching ALL points across any gene and tissue. We may wish to revisit this
    due to performance considerations. (FIXME)
    """
    try:
        chrom = request.args["chrom"]
        start = int(request.args["start"])
        end = int(request.args["end"])
    except (KeyError, ValueError):
        abort(400)
        return

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


@api_blueprint.route("/variant/<chrom_pos>/", methods=["GET"])
def query(chrom_pos):
    """
    Fetch the data for a single variant (for a PheWAS plot)
    """
    chrom, pos = parse_position(chrom_pos)

    tissue = request.args.get("tissue", None)
    gene_id = request.args.get("gene_id", None)

    data = [
        res.to_dict()
        for res in query_variants(chrom, pos, tissue=tissue, gene_id=gene_id)
    ]
    if not data:
        abort(404)

    for i, item in enumerate(data):
        # FIXME: Ugly hack: add a synthetic ID, just so that locuszoom can tell the difference between any
        #   two given items on the plot
        item["id"] = i

    results = {"data": data}
    return jsonify(results)
