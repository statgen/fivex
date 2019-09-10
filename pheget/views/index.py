"""
Home Page.
"""

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
)

import pheget

@pheget.app.route('/')
def home():
    return render_template('index.html')

