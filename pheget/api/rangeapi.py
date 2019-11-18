"""
API endpoints (return JSON, not html)
"""
from flask import jsonify, request, abort

import pheget
from pheget.api.format import query_variants


@pheget.app.route('/api/range', methods=['GET'])
def range_query():  # fields to get: chrom, start, end, gene_id, tissue
    """An API endpoint that returns data in nicely formatted JSON. Fetching data as JSON allows a single HTML file
    to update interactively without reloading (with appropriate supporting page code)."""
    # chrom, pos = parse_position(chrom_pos)
    try:
        chrom = request.args['chrom']
        start = int(request.args['start'])
        end = int(request.args['end'])
    except (KeyError, ValueError):
        abort(404)

    tissue = request.args.get('tissue', None)
    gene_id = request.args.get('gene_id', None)

    data = [res.to_dict()
            for res in query_variants(chrom=chrom, start=start, end=end, tissue=tissue, gene_id=gene_id)]
    for i, item in enumerate(data):
        # FIXME: Ugly hack: add a synthetic ID, just so that locuszoom can tell the difference between any
        #   two given items on the plot
        item['id'] = i

    results = {'data': data}
    return jsonify(results)
