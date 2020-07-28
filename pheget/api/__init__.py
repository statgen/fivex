"""
API endpoints (return JSON, not HTML)
"""

import gzip
import math
import sqlite3

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
    piponly = request.args.get("piponly", None)

    data = [
        res.to_dict()
        for res in query_variants(
            chrom=chrom,
            start=start,
            end=end,
            tissue=tissue,
            gene_id=gene_id,
            piponly=piponly,
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
                "SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? ORDER BY pval LIMIT 1;",
                ("chr" + chrom, start, end,),
            )
        else:
            cursor.execute(
                "SELECT * FROM sig WHERE chrom=? AND pos >= ? AND pos <= ? AND gene_id LIKE ? ORDER BY pval LIMIT 1;",
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


@api_blueprint.route("/gene/<string:gene_id>/", methods=["GET"])
def gene_data_for_region_table(gene_id: str):
    """
    Fetch the data for a single gene to populate the table in region view
    Requires supporting data (see model.py for details).
    """
    source = model.get_gene_data_table(gene_id.split(".")[0])
    data = []
    with gzip.open(source) as f:
        for line in f:
            (
                chromosome,
                position,
                ref_allele,
                alt_allele,
                tissue,
                pip_cluster,
                spip,
                pip,
                pval_nominal,
                beta,
                stderr_beta,
            ) = (line.decode("utf-8").rstrip("\n").split("\t"))
            chromosome = chromosome.replace("chr", "")
            position = int(position)
            pip_cluster = int(pip_cluster)
            spip = float(spip)
            pip = float(pip)
            pval_nominal = float(pval_nominal)
            if pval_nominal > 0:
                log_pvalue = -math.log10(pval_nominal)
            else:
                log_pvalue = math.inf
            beta = float(beta)
            stderr_beta = float(stderr_beta)
            tempDict = {
                "chromosome": chromosome,
                "position": position,
                "ref_allele": ref_allele,
                "alt_allele": alt_allele,
                "tissue": tissue,
                "pip_cluster": pip_cluster,
                "spip": spip,
                "pip": pip,
                "log_pvalue": log_pvalue,
                "beta": beta,
                "stderr_beta": stderr_beta,
            }
            data.append(tempDict)
    results = {"data": data}
    return jsonify(results)
