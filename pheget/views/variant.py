"""
Variant View Page.
"""

from flask import render_template
from genelocator import get_genelocator

import pheget
from pheget.views.format import parse_position

gl = get_genelocator('GRCh38', gencode_version=32, coding_only=True)


@pheget.app.route('/variant/<chrom_pos>/')
def variant_view(chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = parse_position(chrom_pos)
    nearest_genes = gl.at(chrom, pos)
    return render_template('phewas.html', chrom=chrom, pos=pos, nearest_genes=nearest_genes)
