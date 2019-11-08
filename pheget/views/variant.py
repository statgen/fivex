"""
Variant View Page.
"""

from flask import render_template

import pheget
#from pheget.views.format import parse_position
import pheget.views.format


@pheget.app.route('/variant/<chrom_pos>/')
def variant_view(chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = pheget.views.format.parse_position(chrom_pos)
    data = [res.to_dict() for res in pheget.views.format.get_variant_info(chrom, pos)][0]
    #(chrom2, pos2, ref, alt, top_gene, top_tissue, ac, af, an) 
    ref = data['refAllele']
    alt = data['altAllele']
    top_gene = data['top_gene']
    top_tissue = data['top_tissue']
    ac = data['ac']
    af = data['af']
    an = data['an']
    return render_template('phewas.html', chrom=chrom, pos=pos, ref=ref, alt=alt, top_gene=top_gene, top_tissue=top_tissue, ac=ac, af=af, an=an)
