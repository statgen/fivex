"""
Configuration specific to a generic development environment

This controls settings that enable a developer-friendly experience. It is *not* where machine-specific
configuration is stored. For that, use a .env file in your local directory

Recommended reading:
https://12factor.net/
"""
from .base import *  # noqa

DEBUG = True
DEBUG_TB_ENABLED = True
# Mostly the default set, but disable some (like SQLAlchemy) that do not apply here
DEBUG_TB_PANELS = [
    "flask_debugtoolbar.panels.versions.VersionDebugPanel",
    "flask_debugtoolbar.panels.timer.TimerDebugPanel",
    "flask_debugtoolbar.panels.headers.HeaderDebugPanel",
    "flask_debugtoolbar.panels.request_vars.RequestVarsDebugPanel",
    "flask_debugtoolbar.panels.config_vars.ConfigVarsDebugPanel",
    "flask_debugtoolbar.panels.template.TemplateDebugPanel",
    "flask_debugtoolbar.panels.logger.LoggingPanel",
    "flask_debugtoolbar.panels.route_list.RouteListDebugPanel",
    "flask_debugtoolbar.panels.profiler.ProfilerDebugPanel",
]

# Provide a default secret key if one is not present in the user's .env file
SECRET_KEY: str = (
    SECRET_KEY  # noqa type: ignore
    or "for development environments we provide some generic secret key placeholder"
)
