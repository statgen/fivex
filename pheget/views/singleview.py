"""
Variant View Page.
"""

from flask import render_template

import pheget
from pheget.views.format import parse_position


@pheget.app.route('/single/<gene_id>/<tissue>/<chrom_pos>/')
def single_view(gene_id, tissue, chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = parse_position(chrom_pos)
    return render_template('singleview.html', chrom=chrom, pos=pos, gene_id=gene_id, tissue=tissue)
