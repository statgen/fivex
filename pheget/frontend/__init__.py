"""
Front end views: pages that are visited in the web browser and return HTML
"""
from flask import Blueprint, abort, render_template, request
from genelocator import exception as gene_exc, get_genelocator  # type: ignore

from . import format

gl = get_genelocator("GRCh38", gencode_version=32, coding_only=True)

views_blueprint = Blueprint("frontend", __name__, template_folder="templates")


@views_blueprint.route("/")
def home():
    """Site homepage"""
    return render_template("frontend/index.html")


@views_blueprint.route("/singlegene/", methods=["GET"])
def single_view():
    """Region view"""
    # All params always required
    chrom = request.args.get("chrom", None)
    pos = request.args.get("pos", None)
    tissue = request.args.get("tissue", None)

    # One of these params is needed
    gene_id = request.args.get("gene_id", None)
    symbol = request.args.get("symbol", None)

    if not (chrom and pos and tissue) or not (gene_id or symbol):
        return abort(400)

    return render_template(
        "frontend/singleview.html",
        chrom=chrom,
        pos=pos,
        gene_id=gene_id,
        tissue=tissue,
        symbol=symbol,
    )


@views_blueprint.route("/variant/<chrom_pos>/")
def variant_view(chrom_pos):
    """Single variant (PheWAS) view"""
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view

    chrom, pos = format.parse_position(chrom_pos)

    (
        ref,
        alt,
        top_gene,
        top_tissue,
        ac,
        af,
        an,
        rsid,
    ) = format.get_variant_info(chrom, pos)

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
        ref=ref,
        alt=alt,
        top_gene=top_gene,
        top_tissue=top_tissue,
        ac=ac,
        af=af,
        an=an,
        rsid=rsid,
        nearest_genes=nearest_genes,
        is_inside_gene=is_inside_gene,
    )
