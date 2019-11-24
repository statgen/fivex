"""
Configuration specific to a generic production environment

This controls settings that enable a production-friendly experience. It is *not* where machine-specific
configuration is stored. For that, use a .env file in your local directory
"""

from .base import *  # noqa

DEBUG = False
SESSION_COOKIE_SECURE = True
