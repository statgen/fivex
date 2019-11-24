"""
Models/ datastores
"""
import os

from flask import current_app


def locate_data(chrom):
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        f"{chrom}.All_Tissues.sorted.txt.gz",
    )
