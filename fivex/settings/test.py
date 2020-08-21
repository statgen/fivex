"""
Useful settings for running unit tests
"""

from .base import *  # noqa

# All tests must run against the pre-provided sample data, to ensure that test runs are comparable
# This also helps to catch problems like "forgot to add sample data to repo"
FIVEX_DATA_DIR = "data/"
