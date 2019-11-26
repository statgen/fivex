"""
Front end views: pages that are visited in the web browser and return HTML
"""
import sqlite3

from flask import Blueprint, abort, redirect, render_template, request, url_for
from genelocator import exception as gene_exc, get_genelocator  # type: ignore

from .. import model
from ..api.format import TISSUE_DATA
from . import format

gl = get_genelocator("GRCh38", gencode_version=32, coding_only=True)

views_blueprint = Blueprint("frontend", __name__, template_folder="templates")


@views_blueprint.route("/")
def home():
    """Site homepage"""
    return render_template("frontend/index.html")


@views_blueprint.route("/region/", methods=["GET"])
def region_view():
    """Region view"""
    # The canonical form of this view uses start and end query params
    #  However, for convenience, some plots will want to link by a single position.
    # We implement this as a simple redirect that otherwise preserves the query string.
    pos = request.args.get("position", None)
    if pos:
        args = request.args.copy()
        pos = int(pos)
        args.pop("position")
        # FIXME: Add a smarter way of choosing default region size etc (eg making MAX_SIZE a config option, to allow
        #   performance to be tuned per dataset)
        args["start"] = max(pos - 500000, 1)
        args["end"] = pos + 500000
        return redirect(url_for("frontend.region_view", **args))

    # Chromosome is always required
    try:
        chrom = request.args["chrom"]
        if chrom[0:3] == "chr":
            chrom = chrom[3:]
    except (KeyError, ValueError):
        return abort(400)

    # We allow a few different combinations of other missing data
    #  by looking up the best tissue, best gene, or proper range if they are missing

    # First, process start, end, tissue, and gene
    start = request.args.get("start", None)
    end = request.args.get("end", None)
    if start is not None:
        start = int(start)
    if end is not None:
        end = int(end)

    tissue = request.args.get("tissue", None)

    # One of these params is needed (TODO: Pick one of these and resolve differences via omnisearch)
    gene_id = request.args.get("gene_id", None)
    symbol = request.args.get("symbol", None)

    # If there is a chromosome and tissue but no range, then try to fill in the range
    if tissue and (start is None or end is None):
        conn = sqlite3.connect(model.get_sig_lookup())
        with conn:
            try:
                (
                    sqlgene,
                    sqlchrom,
                    sqlpos,
                    sqlref,
                    sqlalt,
                    sqlpval,
                    sqltissue,
                ) = list(
                    conn.execute(
                        f'SELECT * FROM sig WHERE chrom="chr{chrom}" AND tissue="{tissue}" ORDER BY pval LIMIT 1;'
                    )
                )[
                    0
                ]
                start = max(int(sqlpos) - 500000, 1)
                end = int(sqlpos + 500000)
            except IndexError:
                return abort(
                    400
                )  # This should never happen - all chromosome x tissue combo should have at least one point

    # If there is a chromosome, start, and end, but no tissue or gene_id, then find out the best tissue and gene_id
    if chrom and start and end and (tissue is None or gene_id is None):
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
                        f'SELECT * FROM sig WHERE chrom="chr{chrom}" AND pos >= {start} AND pos <= {end} ORDER BY pval LIMIT 1;'
                    )
                )[
                    0
                ]
                if tissue is None:
                    tissue = sqltissue
                if gene_id is None:
                    gene_id = sqlgene_id
            except IndexError:
                return abort(400)

    center = (end + start) // 2

    # Get the full tissue list from TISSUE_DATA
    tissue_list = TISSUE_DATA.keys()

    # First, load the gene_id -> gene_symbol conversion table (no version numbers at the end of ENSG's)
    gene_json = model.get_gene_names_conversion()

    # Query the sqlite3 database for the range (chrom:start-end) and get the list of all genes
    conn = sqlite3.connect(model.get_sig_lookup())
    with conn:
        geneid_list = list(
            conn.execute(
                f'SELECT DISTINCT(gene_id) FROM sig WHERE chrom="chr{chrom}" AND pos >= {start} AND pos <= {end};'
            )
        )
    gene_list = dict()
    for geneid in geneid_list:
        gene_list[str(geneid[0])] = str(
            gene_json.get(geneid[0].split(".")[0], "")
        )

    return render_template(
        "frontend/region.html",
        chrom=chrom,
        start=start,
        end=end,
        center=center,
        gene_id=gene_id,
        tissue=tissue,
        symbol=symbol,
        tissue_list=tissue_list,
        gene_list=gene_list,
    )


@views_blueprint.route("/variant/<string:chrom>_<int:pos>/")
def variant_view(chrom: str, pos: int):
    """Single variant (PheWAS) view"""
    annotations = format.get_variant_info(chrom, pos)

    try:
        nearest_genes = gl.at(chrom, pos)
    except (gene_exc.NoResultsFoundException, gene_exc.BadCoordinateException):
        nearest_genes = []

    # Are the "nearest genes" nearby, or is the variant actually inside the gene?
    # These rules are based on the defined behavior of the genes locator
    is_inside_gene = len(nearest_genes) > 1 or (
        len(nearest_genes) == 1
        and nearest_genes[0]["start"] <= pos <= nearest_genes[0]["end"]
    )

    return render_template(
        "frontend/phewas.html",
        chrom=chrom,
        pos=pos,
        ref=annotations.ref_allele,
        alt=annotations.alt_allele,
        top_gene=annotations.top_gene,
        top_tissue=annotations.top_tissue,
        ac=annotations.ac,
        af=annotations.af,
        an=annotations.an,
        rsid=annotations.rsid,
        nearest_genes=nearest_genes,
        is_inside_gene=is_inside_gene,
    )
