"""
Variant View Page.
"""

from flask import render_template, request

import pheget
from pheget.views.format import parse_position


@pheget.app.route('/singlegene', methods=['GET'])
def single_view():
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom = request.args.get('chrom', None)
    pos = request.args.get('pos', None)
    gene_id = request.args.get('gene_id', None)
    tissue = request.args.get('tissue', None)
    return render_template('singleview.html', chrom=chrom, pos=pos, gene_id=gene_id, tissue=tissue)
