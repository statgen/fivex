#! /usr/bin/env bash

# Sample production deployment script. Must be run by a user with write permissions on all relevant folders.


## Update code manually: it doesn't make sense to run an old deployment script
#git checkout master --force
#git pull

# Update dependencies (respecting package lock files where relevant)
/data/eqtl-browser/venv/bin/pip3 install -r requirements/prod.txt
npm ci

# Remove previous built assets and replace with the newest vue.js frontend code
npm run build
rm -rf /var/www/pheget/*
cp -r dist/* /var/www/pheget

sudo service pheget restart
