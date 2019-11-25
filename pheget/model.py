"""
Models/ datastores
"""
import os
import pickle

from flask import current_app


def locate_data(chrom):
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        f"{chrom}.All_Tissues.sorted.txt.gz",
    )


def locate_tissue_data(tissue):
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        f"{tissue}.allpairs.sorted.txt.gz",
    )


def get_gene_lookup():
    """Get a gene locator object to find the gene names in a given region"""
    with open(
        os.path.join(
            current_app.config["PHEGET_DATA_DIR"], "gene.symbol.pickle"
        ),
        "rb",
    ) as f:
        return pickle.load(f)


def get_best_per_variant_lookup():
    """Get the path to a file describing the best hits for a given variant"""
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        "best.genes.tissues.allele.info.rsnum.txt.gz",
    )


def get_region_most_sig_tissue_variant_lookup():
    """Get the path to an sqlite3 database file containing some data for eQTLs more significant than 1e-5"""
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"], "sig.lookup.db",
    )
