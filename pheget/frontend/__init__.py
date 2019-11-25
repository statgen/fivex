"""
Front end views: pages that are visited in the web browser and return HTML
"""
from flask import Blueprint, abort, redirect, render_template, request, url_for
from genelocator import exception as gene_exc, get_genelocator  # type: ignore

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

    try:
        # These params are always required. They are query params so the URL can update as the plot is scrolled.
        chrom = request.args["chrom"]
        start = int(request.args["start"])
        end = int(request.args["end"])
    except (KeyError, ValueError):
        return abort(400)

    center = (end + start) // 2

    tissue = request.args.get("tissue", None)

    # One of these params is needed (TODO: Pick one of these and resolve differences via omnisearch)
    gene_id = request.args.get("gene_id", None)
    symbol = request.args.get("symbol", None)

    if not tissue or not (gene_id or symbol):
        return abort(400)

    tissue_list = TISSUE_DATA.keys()

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
