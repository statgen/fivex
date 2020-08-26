"""
Sample wsgi file for running the app in production
"""
import fivex

app = fivex.create_app("fivex.settings.prod")
