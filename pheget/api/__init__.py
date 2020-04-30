"""
API endpoints (return JSON, not HTML)
"""

import sqlite3
from typing import List

from flask import Blueprint, jsonify, request

from .. import model
from .format import query_variants

api_blueprint = Blueprint("api", __name__)


@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/", methods=["GET"]
)
def region_query(chrom, start, end):
    """
    Fetch the eQTL data for a given region, optionally filtering by tissue and gene_id

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


@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/best/", methods=["GET"]
)
def region_query_bestvar(chrom: str, start: int, end: int):
    """
    Given a region, returns the tissue with the strongest single eQTL signal, along with gene symbol and gene_id.

    Optionally, a gene_id can be specified as query param, in which it will get the best signal within that gene.
    """
    gene_id = request.args.get("gene_id", None)
    gene_json = model.get_gene_names_conversion()
    if chrom is not None and chrom[0:3] == "chr":
        chrom = chrom[3:]

    # FIXME: Move SQL work to models.py (out of view logic)
    conn = sqlite3.connect(model.get_sig_lookup())
    with conn:
        cursor = conn.cursor()
        if gene_id is None:
            cursor.execute(
                f"SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? ORDER BY pval LIMIT 1;",
                ("chr" + chrom, start, end,),
            )
        else:
            cursor.execute(
                f"SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? AND gene_id LIKE ? ORDER BY pval LIMIT 1;",
                ("chr" + chrom, start, end, gene_id.split(".")[0] + "._%",),
            )

        result = cursor.fetchone()

        if result is None:
            return (
                jsonify(
                    {
                        "errors": [
                            {
                                "detail": "No variants found for specified region or gene"
                            }
                        ]
                    },
                ),
                404,
            )

        (
            sqlgene_id,
            sqlchrom,
            sqlpos,
            sqlref,
            sqlalt,
            sqlval,
            sqltissue,
        ) = result

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

    for i, item in enumerate(data):
        # FIXME: replace this synthetic field with some other unqiue identifier (like a marker)
        item["id"] = i

    results = {"data": data}
    return jsonify(results)


@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/top10pip/", methods=["GET"]
)
def region_query_toppip(chrom: str, start: int, end: int):
    """
    Given a region and optionally gene_id ('ENSG#'), returns the top 10 gene x
    tissue combinations with the best independent PIP signals, along with gene
    symbol, gene_id, p-value, effect size, and standard error of effect size in
    the given genomic region.
    """
    gene_id = request.args.get("gene_id", None)
    if chrom is not None and chrom[0:3] == "chr":
        chrom = chrom[3:]
    data = [
        res.to_dict()
        for res in query_variants(chrom, start, end=end, gene_id=gene_id)
    ]
    top10piplist = []  # key gene_id, tissue, pip_cluster
    top10keylist = []
    top10datalist = [[] for i in range(10)]  # type: List[list]
    for i in range(1, 11):
        top10keylist.append("Tissue:Gene:" + str(i))
        top10piplist.append(float(i) * 1e-6)
        # top10datalist.append([])
    minPip = 1e-6
    minPipIdx = 0
    for datapoint in data:
        newkey = ":".join(
            [
                datapoint["tissue"],
                datapoint["gene_id"],
                str(datapoint["pip_cluster"]),
            ]
        )
        if (
            newkey in top10keylist
        ):  # If this tissue x gene x cluster combination is already in the list, compare PIPs, and if this PIP is bigger, replace the data, otherwise ignore
            if datapoint["pip"] > top10piplist[top10keylist.index(newkey)]:
                newidx = top10keylist.index(newkey)
                top10piplist[newidx] = datapoint["pip"]
                top10datalist[newidx] = datapoint
                minPip = min(top10piplist)
                minPipIdx = top10piplist.index(minPip)
        elif (
            datapoint["pip"] > minPip
        ):  # If the current PIP is larger than the smallest of the 10 in our list, replace the smallest with our current point
            top10piplist[minPipIdx] = datapoint["pip"]
            top10keylist[minPipIdx] = newkey
            top10datalist[minPipIdx] = datapoint
            minPip = min(top10piplist)
            minPipIdx = top10piplist.index(minPip)
    return jsonify(top10datalist)
