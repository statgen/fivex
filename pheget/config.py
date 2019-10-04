"""
Pheget Development

Alan Kwong<awkwong@umich.edu>
Mukai Wang<wangmk@umich.edu>
"""

import os

# Root of this application, useful if it doesn't occupy an entire domain
APPLICATION_ROOT = '/'


# Database file is data/, currently not using
DATABASE_FILENAME = os.path.join(
    os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    'data', 'gene.chrom.pos.lookup.sqlite3.db'
)