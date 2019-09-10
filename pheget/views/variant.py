"""
Variant View Page.
"""

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
)

import pheget
from pheget.views.format import parse_position

@pheget.app.route('/variant/<chrom_pos>/')
def variant_view(chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = parse_position(chrom_pos)
    return render_template('phewas.html', chrom=chrom, pos=pos)
