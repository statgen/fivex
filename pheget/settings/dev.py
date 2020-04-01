"""
Configuration specific to a generic development environment

This controls settings that enable a developer-friendly experience. It is *not* where machine-specific
configuration is stored. For that, use a .env file in your local directory

Recommended reading:
https://12factor.net/
"""
from .base import *  # noqa

DEBUG = True

# Provide a default secret key if one is not present in the user's .env file
SECRET_KEY: str = (
    SECRET_KEY  # noqa type: ignore
    or "for development environments we provide some generic secret key placeholder"
)
