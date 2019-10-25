"""
Common configuration variables for the application
"""

import os

# Root of this application, useful if it doesn't occupy an entire domain
APPLICATION_ROOT = '/'

#DATA_DIR = '/home/amkwong/backup' # 'data'
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), 'data')

# Database file is data/, currently not using
DATABASE_FILENAME = os.path.join(
    os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    'data', 'gene.chrom.pos.lookup.sqlite3.db'
)
