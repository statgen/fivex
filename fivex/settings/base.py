"""
Common configuration variables for the application
"""

import os

from dotenv import load_dotenv  # type: ignore

# Load machine or deployment-specific configuration values from a local .env file
load_dotenv()

# Root of this application, useful if it doesn't occupy an entire domain
APPLICATION_ROOT = "/"
SECRET_KEY = os.getenv("SECRET_KEY", None)


# Default data directory - this contains both variant-level (tabixed) data files and supporting databases
FIVEX_DATA_DIR = os.getenv(
    "FIVEX_DATA_DIR",
    os.path.join(
        os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        ),
        "data",
    ),
)


# Type of data to display in FIVEx
# "ge" = gene expression
# "txrev" = Txrevise data
DATATYPE = "ge"


# .env file can optionally provide a Sentry key for automatic error reporting
# TODO: add for frontend and backend
SENTRY_DSN = os.getenv("SENTRY_DSN", None)
