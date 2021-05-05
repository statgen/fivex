"""
API endpoints (return JSON, not HTML)
"""

import gzip
import math
import sqlite3

from flask import Blueprint, jsonify, request

from .. import model
from .format import position_to_variant_id, query_variants

api_blueprint = Blueprint("api", __name__)


@api_blueprint.route(
    "/region/<string:chrom>/<int:start>-<int:end>/<string:study>/<string:tissue>/",
    methods=["GET"],
)
def region_query(chrom, start, end, study, tissue):
    """
    Fetch the eQTL data for a given region, optionally filtering by tissue and gene_id

    In its current form, this allows fetching ALL points across any gene and tissue. We may wish to revisit this
    due to performance considerations. (FIXME)
    """
    # tissue = request.args.get("tissue", None)
    gene_id = request.args.get("gene_id", None)
    # FIXME: Should study be required for this query? (to avoid ambiguity if two studies use same tissue names)
    # study = request.args.get("study", None)
    piponly = request.args.get("piponly", None)

    data = [
        res.to_dict()
        for res in query_variants(
            chrom=chrom,
            start=start,
            rowstoskip=1,  # Region query uses the original EBi data files, which all have a header row
            end=end,
            study=study,
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
    "/best/region/<string:chrom>/<int:start>-<int:end>/", methods=["GET"]
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

    (
        gene_id,
        chrom,
        pos,
        ref,
        alt,
        pip,
        study,
        tissue,
    ) = model.get_best_study_tissue_gene(chrom, start, end)

    data = {
        "chrom": chrom,
        "pos": pos,
        "ref": ref,
        "alt": alt,
        "study": study,
        "tissue": tissue,
        "gene_id": gene_id,
        "symbol": gene_json.get(gene_id, "Unknown_gene"),
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
    study = request.args.get(
        "study", None
    )  # We now have data from multiple studies from EBI

    data = [
        res.to_dict()
        for res in query_variants(
            chrom=chrom,
            start=pos,
            rowstoskip=0,
            end=None,
            tissue=tissue,
            study=study,
            gene_id=gene_id,
        )
    ]

    for i, item in enumerate(data):
        # FIXME: replace this synthetic field with some other unique identifier (like a marker)
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
    try:
        with gzip.open(source) as f:
            # FIXME: Add a "study" column to this file, then serialize in API to feed the table
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
                    "variant_id": position_to_variant_id(
                        chromosome, position, ref_allele, alt_allele
                    ),
                    "tissue": tissue,
                    "pip_cluster": pip_cluster,
                    "spip": spip,
                    "pip": pip,
                    "log_pvalue": log_pvalue,
                    "beta": beta,
                    "stderr_beta": stderr_beta,
                }
                data.append(tempDict)
    # Not being able to find a file is normal:
    # Sometimes the listed gene has no variants with PIP > 1e-5 (the filtering criteria),
    # in which case the corresponding gene-specific PIP file will not exist.
    # When this happens, FIVEx should simply return an empty results json object to the page.
    except FileNotFoundError:
        pass
    results = {"data": data}
    return jsonify(results)
