"""
Configuration specific to a generic development environment

This controls settings that enable a developer-friendly experience. It is *not* where machine-specific
configuration is stored. For that, use a .env file in your local directory

Recommended reading:
https://12factor.net/
"""
from .base import *  # noqa

DEBUG = True

# TODO: Add flask debug toolbar to help Alan with his performance optimizations
