"""
API endpoints (return JSON, not HTML)
"""

from flask import Blueprint, jsonify, request
from zorp import readers  # type: ignore

from .. import model
from .format import CIParser, query_variants

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
    # Study and tissue are now both required parameters
    gene_id = request.args.get("gene_id", None)
    transcript = request.args.get("transcript", None)
    piponly = request.args.get("piponly", None)
    datatype = request.args.get("datatype", "ge")
    if gene_id is not None:
        gene_id = gene_id.split(".")[0]

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
            transcript=transcript,
            piponly=piponly,
            datatype=datatype,
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
    if gene_id is not None:
        gene_id = gene_id.split(".")[0]
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
    ) = model.get_best_study_tissue_gene(
        chrom, start=start, end=end, gene_id=gene_id
    )

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
    transcript = request.args.get("transcript", None)
    datatype = request.args.get("datatype", "ge")
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
            transcript=transcript,
            datatype=datatype,
        )
    ]

    for i, item in enumerate(data):
        # FIXME: replace this synthetic field with some other unique identifier (like a marker)
        item["id"] = i

    results = {"data": data}
    return jsonify(results)


@api_blueprint.route(
    "/cs/<string:chrom>/<int:start>-<int:end>/", methods=["GET"]
)
def region_data_for_region_table(chrom: str, start: int, end: int):
    """
    Fetch the data for a region to populate the table in region view
    Retrieves all data from the chromosome-specific merged credible_sets file
    """
    datatype = request.args.get("datatype", "ge")
    gene_id = request.args.get("gene_id", None)
    source = model.get_credible_data_table(chrom, datatype)
    reader = readers.TabixReader(
        source=source, parser=CIParser(study=None, tissue=None), skip_rows=0,
    )
    if gene_id is not None:
        reader.add_filter("gene_id", gene_id)
    ciRows = reader.fetch(chrom, start - 1, end + 1)
    # We want to retrieve the following data to fill the columns of our table:
    # Variant (chr:pos_ref/alt), study, tissue, P-value, effect size, SD(effect size), PIP, cs_label, cs_size
    # Each row holds the following data:
    # study: str
    # tissue: str
    # gene_id: str  # this column is labeled "phenotype_id" in the original file
    # var_id: str  # in chrom_pos_ref_alt format -- not used
    # chromosome: str
    # position: int
    # ref_allele: str
    # alt_allele: str
    # cs_id: str
    # cs_index: str
    # finemapped_region: str
    # pip: float
    # z: float
    # cs_min_r2: float
    # cs_avg_r2: float
    # cs_size: int
    # posterior_mean: float
    # posterior_sd: float
    # cs_log10bf: float
    data = []
    for row in ciRows:
        data.append(
            {
                "study": row.study,
                "tissue": row.tissue,
                "gene_id": row.gene_id,
                "chromosome": row.chromosome,
                "position": row.position,
                "ref_allele": row.ref_allele,
                "alt_allele": row.alt_allele,
                "cs_index": row.cs_index,
                "pip": row.pip,
                "cs_size": row.cs_size,
                "variant_id": row.variant_id,
            }
        )
    results = {"data": data}
    return jsonify(results)
