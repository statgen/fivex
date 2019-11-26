"""
Sample wsgi file for running the app in production
"""
import pheget

app = pheget.create_app("pheget.settings.prod")
