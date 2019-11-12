"""
API endpoints (return JSON, not html)
"""
from flask import jsonify, request

import pheget
from pheget.api.format import query_range


@pheget.app.route('/api/range', methods=['GET'])
def range_query():  # fields to get: chrom, start, end, gene_id, tissue
    """An API endpoint that returns data in nicely formatted JSON. Fetching data as JSON allows a single HTML file
    to update interactively without reloading (with appropriate supporting page code)."""
    #chrom, pos = parse_position(chrom_pos)
    chrom = request.args.get('chrom', None)
    start = int(request.args.get('start', None))
    end = int(request.args.get('end', None))
    tissue = request.args.get('tissue', None)
    gene_id = request.args.get('gene_id', None)

    data = [res.to_dict()
            for res in query_range(chrom=chrom, start=start, end=end, tissue=tissue, gene_id=gene_id)]
    for i, item in enumerate(data):
        # FIXME: Ugly hack: add a synthetic ID, just so that locuszoom can tell the difference between any
        #   two given items on the plot
        item['id'] = i

    results = {'data': data}
    return jsonify(results) 