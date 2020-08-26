#!/bin/bash
#
# Clean, build and start server in a development environment


# Stop on errors, print commands
set -e

# Set environment variables
export FLASK_DEBUG=True
export FLASK_APP="fivex:create_app('fivex.settings.dev')"


# Run the development server on port 8000
flask run --host 0.0.0.0 --port 5000
