#!/bin/bash
#
# phegetrun
#
# Clean, build and start server


# Stop on errors, print commands
set -e

# Set environment variables
export FLASK_DEBUG=True
export FLASK_APP="pheget:create_app('pheget.settings.dev')"


# Run the development server on port 8000
flask run --host 0.0.0.0 --port 5000
