#! /usr/bin/env bash

# Sample production deployment script. Must be run by a user with write permissions on all relevant folders.

# Stop on failure and echo each instruction run (to aid debugging deploy failures)
set -e
set -x

## For now, update code manually: it doesn't make sense to run a deployment script that is out of date
# As we use this script for a while, we can consider automating the git steps too (once we know that deploy.sh won't
#   change much)
#git checkout master
#git pull

# Update dependencies (respecting package lock files where relevant)
/data/eqtl-browser/venv/bin/pip3 install -r requirements/prod.txt
npm ci

# Remove previous built assets and replace with the newest vue.js frontend code
npm run build
rm -rf /var/www/pheget/*
cp -r dist/* /var/www/pheget

sudo service pheget restart
