"""
Configuration specific to a generic production environment

This controls settings that enable a production-friendly experience. It is *not* where machine-specific
configuration is stored. For that, use a .env file in your local directory
"""

from .base import *  # noqa

DEBUG = False
DEBUG_TB_ENABLED = False

if not SECRET_KEY:  # type: ignore  # noqa
    raise Exception(
        "A secret key must be provided to run this app in production"
    )

SESSION_COOKIE_SECURE = True
