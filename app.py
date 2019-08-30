"""
Absolute bare-minimum project template for the PheGET eQTL visualization service

For the most part, the routes/urls are defined in this file, and helper code or logic lives in other files
"""

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
)

from util import helpers
from util.read_eqtl import query_variant


app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/variant/<chrom_pos>/')
def variant_view(chrom_pos):
    # TODO: Allow query params to be passed from the base page to the api endpoint, so user can direct link to a
    #   custom view
    chrom, pos = helpers.parse_position(chrom_pos)
    return render_template('phewas.html', chrom=chrom, pos=pos)


@app.route('/api/variant/<chrom_pos>/', methods=['GET'])
def query(chrom_pos):
    """An API endpoint that returns data in nicely formatted JSON. Fetching data as JSON allows a single HTML file
    to update interactively without reloading (with appropriate supporting page code)."""
    chrom, pos = helpers.parse_position(chrom_pos)

    tissue = request.args.get('tissue', None)
    gene_id = request.args.get('gene_id', None)

    data = [res.to_dict()
            for res in query_variant(chrom, pos, tissue=tissue, gene_id=gene_id)]
    for i, item in enumerate(data):
        # FIXME: Ugly hack: add a synthetic ID, just so that locuszoom can tell the difference between any
        #   two given items on the plot
        item['id'] = i

    results = {'data': data}
    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)
