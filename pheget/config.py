"""
Common configuration variables for the application
"""

import os

# Root of this application, useful if it doesn't occupy an entire domain
APPLICATION_ROOT = '/'

# Default data directory - this contains both variant-level (tabixed) data files and supporting databases
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), 'data')

LOCUSZOOM_VERSION = '0.10.0-beta.2'

# To set up a default local data directory, create "localconfig.py" in this directory and
# define DATA_DIR to be the static local path to that directory. This will override the default
# DATA_DIR and make it easier to automate updates.

# Database file is data/, currently not using
DATABASE_FILENAME = os.path.join(
    os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    'data', 'gene.chrom.pos.lookup.sqlite3.db'
)
