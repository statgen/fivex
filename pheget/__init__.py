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

    if app.config["SENTRY_DSN"]:
        # Only activate sentry if it is configured for this app
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration

        sentry_sdk.init(
            app.config["SENTRY_DSN"], integrations=[FlaskIntegration()]
        )
    return app
