"""
Defines the PheGET web application
"""
import flask
from flask_debugtoolbar import DebugToolbarExtension  # type: ignore

from pheget.api import api_blueprint
from pheget.frontend import views_blueprint


def create_app(settings_module="pheget.settings.dev"):
    """Application factory (allows different settings for dev, prod, or test environments)"""
    app = flask.Flask(__name__)
    app.config.from_object(settings_module)

    app.register_blueprint(api_blueprint, url_prefix="/api")
    app.register_blueprint(views_blueprint, url_prefix="/")
    # Flask debug toolbar: only enabled when debug mode is active
    DebugToolbarExtension(app)
    return app
