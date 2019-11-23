"""
Home Page.
"""

from flask import render_template

import pheget


@pheget.app.route("/")
def home():
    return render_template("index.html")
