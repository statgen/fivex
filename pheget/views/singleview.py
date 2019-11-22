"""
Variant View Page.
"""

from flask import abort, render_template, request

import pheget


@pheget.app.route('/singlegene', methods=['GET'])
def single_view():
    # All params always required
    chrom = request.args.get('chrom', None)
    pos = request.args.get('pos', None)
    tissue = request.args.get('tissue', None)

    # One of these params is needed
    gene_id = request.args.get('gene_id', None)
    symbol = request.args.get('symbol', None)

    if not (chrom and pos and tissue) or not (gene_id or symbol):
        return abort(400)

    return render_template('singleview.html', chrom=chrom, pos=pos, gene_id=gene_id, tissue=tissue, symbol=symbol)
