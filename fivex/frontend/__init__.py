"""
Front end views: provide the data needed by pages that are visited in the web browser
"""
import gzip
import json
import sqlite3

from flask import Blueprint, abort, jsonify, redirect, request, url_for
from genelocator import exception as gene_exc, get_genelocator  # type: ignore
from zorp import readers  # type: ignore

from .. import model
from ..api.format import TISSUES_PER_STUDY, TISSUES_TO_SYSTEMS
from .format import gencodeParser, gencodeTranscriptParser

gl = get_genelocator("GRCh38", gencode_version=32, coding_only=True)

views_blueprint = Blueprint("frontend", __name__, template_folder="templates")


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
    # We will use the new get_best_study_tissue_gene
    # parameters: (chrom, start=None, end=None, study=None, tissue=None, gene_id=None)

    # First, process start, end, tissue, study, and gene
    start = request.args.get("start", None)
    end = request.args.get("end", None)
    if start is not None:
        start = int(start)
    if end is not None:
        end = int(end)

    tissue = request.args.get("tissue", None)
    #   If study is missing, we will fetch it from get_best_study_tissue_gene
    study = request.args.get("study", None)

    # One of these params is needed (TODO: Pick one of these and resolve differences via omnisearch)
    # Always strip version numbers from ENSG#
    gene_id = request.args.get("gene_id", None)
    if gene_id is not None:
        gene_id = gene_id.split(".")[0]
    symbol = request.args.get("symbol", None)

    # If the request does not include a start or end position, then find the TSS and strand information,
    # then generate a window based on this information
    if start is None and end is None:
        with gzip.open(model.locate_tss_data(), "rb") as f:
            tss_dict = json.load(f)
            # tss contains two pieces of information: the genomic position of the TSS, and the strand
            # if it is the + strand, then the tss is positive; if it is the - strand, then the tss is negative
        tss = tss_dict.get(gene_id, None)
        if tss is None:
            return abort(400)
        else:
            # We will generate a viewing window 250k around the TSS for simplicity
            # TODO: actually retrieve the start and end positions from gencode and use those instead
            #       (if it's not too wide)
            start = max(abs(int(tss)) - 250000, 1)
            end = start + 500000

    # First, load the gene_id -> gene_symbol conversion table (no version numbers at the end of ENSG's)
    gene_json = model.get_gene_names_conversion()

    # If either gene_id or symbol is present, then fill in the other
    if symbol is None and gene_id is not None:
        symbol = gene_json.get(gene_id.split(".")[0], None)
    elif symbol is not None and gene_id is None:
        gene_id = gene_json.get(symbol, None)

    # We will use get_best_study_tissue_gene(chrom, start, end) to directly query for a recommendation
    # Given only a chromosome or a range, this will return the following:
    #  (gene_id, chrom, pos, ref, alt, pip, study, tissue)
    # from which we will grab study, tissue, and gene_id as the recommended plot to show.
    # The returned data is: (gene_id, chrom, pos, ref, alt, pip, study, tissue)

    # Get the full tissue list from TISSUE_DATA
    tissue_list = TISSUES_TO_SYSTEMS.keys()

    # If there are missing pieces of data, try to fill it in using get_best_study_tissue_gene
    if None in (study, tissue, gene_id):
        # Retrieve the study x tissue x gene combination with highest PIP
        (
            gene_id,
            chrom,
            pos,
            _,
            _,
            _,
            study,
            tissue,
        ) = model.get_best_study_tissue_gene(
            chrom,
            start=start,
            end=end,
            study=study,
            tissue=tissue,
            gene_id=gene_id,
        )
        center = pos
    # If both start and end exist, calculate the center
    if start and end:
        center = (end + start) // 2

    source = model.locate_gencode_data()
    reader = readers.TabixReader(source, parser=gencodeParser(), skip_rows=0)
    gencodeRows = reader.fetch(f"chr{chrom}", start - 1, end + 1)
    gene_list = []
    for row in gencodeRows:
        gene_list.append(row.gene_id)
    gene_dict = {
        str(geneid): str(gene_json.get(geneid, geneid)) for geneid in gene_list
    }

    return jsonify(
        {
            "chrom": chrom,
            "start": start,
            "end": end,
            "center": center,
            "gene_id": gene_id,
            "study": study,
            "tissue": tissue,
            "symbol": symbol,
            "tissue_list": list(tissue_list),
            "tissues_per_study": TISSUES_PER_STUDY,
            "gene_list": gene_dict,
        }
    )


@views_blueprint.route("/variant/<string:chrom>_<int:pos>/")
def variant_view(chrom: str, pos: int):
    """Single variant (PheWAS) view"""
    try:
        nearest_genes = gl.at(chrom, pos)
    except (gene_exc.NoResultsFoundException, gene_exc.BadCoordinateException):
        nearest_genes = []

    data_type = request.args.get("data_type", "ge")
    if data_type not in ["ge", "txrev"]:
        # eqtl or sqtls supported. TODO dedup with enum
        return abort(400)

    # Query the best variant SQLite3 database to retrieve the top gene by PIP
    pipIndexErrorFlag = False
    conn = sqlite3.connect(
        model.get_best_per_variant_lookup(data_type=data_type)
    )
    with conn:
        try:
            (
                _,
                top_study,
                top_tissue,
                top_gene,
                chrom,
                pos,
                ref,
                alt,
                _,
                _,
            ) = list(
                conn.execute(
                    "SELECT * FROM sig WHERE chrom=? and pos=? ORDER BY pip DESC LIMIT 1;",
                    (f"{chrom}", pos),
                )
            )[
                0
            ]
        # Sometimes the variant is not present at all in the best variant database
        # This is expected behavior, in this case we store valid empty responses
        except IndexError:
            top_study = "No_study"
            top_tissue = "No_tissue"
            top_gene = "No_gene"
            pipIndexErrorFlag = True
            # return abort(400)

    # Are the "nearest genes" nearby, or is the variant actually inside the gene?
    # These rules are based on the defined behavior of the genes locator
    is_inside_gene = len(nearest_genes) > 1 or (
        len(nearest_genes) == 1
        and nearest_genes[0]["start"] <= pos <= nearest_genes[0]["end"]
    )

    # Retrieve gene_symbol from gene_id
    gene_json = model.get_gene_names_conversion()
    gene_symbol = gene_json.get(top_gene, "Unknown_gene")

    # Query rsid database for chrom, pos, ref, alt, rsid (we only keep the last 3)
    (_, _, rref, ralt, rsid) = model.return_rsid(chrom, pos)

    # If the variant is missing from our credible_sets database,
    # use ref and alt from rsid database
    if pipIndexErrorFlag:
        ref = rref
        alt = ralt

    variant_id = f"{chrom}:{pos}_{ref}/{alt}"

    return jsonify(
        dict(
            chrom=chrom,
            pos=pos,
            ref=ref,
            alt=alt,
            top_gene=top_gene,
            top_gene_symbol=gene_symbol,
            top_study=top_study,
            top_tissue=top_tissue,
            study_names=list(TISSUES_PER_STUDY.keys()),
            nearest_genes=nearest_genes,
            is_inside_gene=is_inside_gene,
            rsid=rsid,
            variant_id=variant_id,
        )
    )


# Duplicate code from the region API above -- separated into its own API call
@views_blueprint.route(
    "/gencode/genes/<string:chrom>/<int:start>-<int:end>/", methods=["GET"]
)
def get_genes_in_region(chrom: str, start: int, end: int):
    """
    Fetch the genes data for a region, and returns a dictionary of ENSG: Gene Symbols
    Retrieves data from our gencode genes file
    """
    source = model.locate_gencode_data()
    reader = readers.TabixReader(source, parser=gencodeParser(), skip_rows=0)
    gencodeRows = reader.fetch(f"chr{chrom}", start - 1, end + 1)
    gene_list = []
    gene_json = model.get_gene_names_conversion()
    for row in gencodeRows:
        gene_list.append(row.gene_id)
    gene_dict = {
        str(geneid): str(gene_json.get(geneid, geneid)) for geneid in gene_list
    }
    return jsonify({"data": gene_dict})


# Same concept as the above route, returning data for looking up transcripts
@views_blueprint.route(
    "/gencode/transcripts/<string:chrom>/<int:start>-<int:end>/",
    methods=["GET"],
)
def get_transcripts_in_region(chrom: str, start: int, end: int):
    """
    Fetch the transcript data for a region
    Retrieves data from our gencode transcripts file
    """
    gene_id = request.args.get("gene_id", None)
    source = model.locate_gencode_transcript_data()
    reader = readers.TabixReader(
        source, parser=gencodeTranscriptParser(), skip_rows=0
    )
    gencodeRows = reader.fetch(f"chr{chrom}", start - 1, end + 1)
    transcriptDict = dict()  # type: ignore
    # If we decide that we want both ENSG:ENST and gene_symbol:transcript_symbol dictionaries
    # Then we can return the extra information below (double dictionary)
    # symbolDict = {}

    # Variables in gencodeTranscriptContainer:
    # chrom: str
    # source: str
    # element: str
    # start: int
    # end: int
    # strand: str
    # gene_id: str
    # transcript_id: str
    # datatype: str
    # symbol: str
    # transcript_type: str
    # transcript_symbol: str

    for row in gencodeRows:
        if gene_id is None or gene_id == row.gene_id:
            ## Extra information for double dictionary
            # if row.gene_id not in transcriptDict:
            #     transcriptDict[row.gene_id] = [row.transcript_id]
            # else:
            #     transcriptDict[row.gene_id].append(row.transcript_id)
            # if row.symbol not in symbolDict:
            #     symbolDict[row.symbol] = [row.transcript_symbol]
            # else:
            #     symbolDict[row.symbol].append(row.transcript_symbol)
            if row.symbol not in transcriptDict:
                transcriptDict[row.symbol] = [row.transcript_id]
            else:
                transcriptDict[row.symbol].append(row.transcript_id)

    return jsonify(
        {
            "chrom": chrom,
            "start": start,
            "end": end,
            "transcriptIDs": transcriptDict,
            # "transcriptSymbols": symbolDict  # Extra information for double dictionary
        }
    )
