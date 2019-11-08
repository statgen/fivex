"""
Variant View Page.
"""

from flask import render_template
from genelocator import exception as gene_exc
from genelocator import get_genelocator

import pheget
from pheget.views.format import parse_position

gl = get_genelocator('GRCh38', gencode_version=32, coding_only=True)


@pheget.app.route('/variant/<chrom_pos>/')
def variant_view(chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = parse_position(chrom_pos)

    try:
        nearest_genes = gl.at(chrom, pos)
    except (gene_exc.NoResultsFoundException, gene_exc.BadCoordinateException):
        nearest_genes = []

    # Are the "nearest genes" nearby, or is the variant actually inside the gene?
    # These rules are based on the defined behavior of the genes locator
    is_inside_gene = (len(nearest_genes) > 1 or
                      (len(nearest_genes) == 1 and nearest_genes[0]['start'] <= pos <= nearest_genes[0]['end']))

    return render_template('phewas.html',
                           chrom=chrom, pos=pos, nearest_genes=nearest_genes, is_inside_gene=is_inside_gene)
