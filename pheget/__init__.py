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

    # This flask app implements a JSON API, and is presented via proxy as, eg `/api/data` and `/api/views`
    # In prod, the proxy is handled by apache. In development, vue handles it. This means that for development,
    #   you will need to run both the Vue and Flask servers, and access the API via the Vue CLI server URL.
    app.register_blueprint(api_blueprint, url_prefix="/data")
    app.register_blueprint(views_blueprint, url_prefix="/views")

    # Flask debug toolbar: only enabled when debug mode is active
    DebugToolbarExtension(app)

    if app.config["SENTRY_DSN"]:
        # Only activate sentry if it is configured for this app
        import sentry_sdk  # type: ignore
        from sentry_sdk.integrations.flask import FlaskIntegration  # type: ignore

        sentry_sdk.init(
            app.config["SENTRY_DSN"], integrations=[FlaskIntegration()]
        )
    return app
