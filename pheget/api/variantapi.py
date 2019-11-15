"""
API endpoints (return JSON, not html)
"""
from flask import jsonify, request

import pheget
from pheget.api.format import query_variants, parse_position


@pheget.app.route('/api/variant/<chrom_pos>/', methods=['GET'])
def query(chrom_pos):
    """An API endpoint that returns data in nicely formatted JSON. Fetching data as JSON allows a single HTML file
    to update interactively without reloading (with appropriate supporting page code)."""
    chrom, pos = parse_position(chrom_pos)

    tissue = request.args.get('tissue', None)
    gene_id = request.args.get('gene_id', None)

    data = [res.to_dict()
            for res in query_variants(chrom, pos, tissue=tissue, gene_id=gene_id)]
    for i, item in enumerate(data):
        # FIXME: Ugly hack: add a synthetic ID, just so that locuszoom can tell the difference between any
        #   two given items on the plot
        item['id'] = i

    results = {'data': data}
    return jsonify(results)
