"""
Models/ datastores
"""
import os

import pheget  # noqa


def locate_data(chrom):
    return os.path.join(
        pheget.app.config["DATA_DIR"], f"{chrom}.All_Tissues.sorted.txt.gz"
    )
