"""
Models/ datastores
"""
import gzip
import json
import os

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


def get_best_per_variant_lookup():
    """Get the path to a file describing the best hits for a given variant"""
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        "best.genes.tissues.allele.info.rsnum.txt.gz",
    )


def get_sig_lookup():
    """Get the path to an sqlite3 database file containing some data for eQTLs more significant than 1e-5"""
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"], "sig.lookup.db",
    )


def get_gene_names_conversion():
    """Get the compressed file containing two-way mappings of gene_id to gene_symbol"""
    with gzip.open(
        os.path.join(
            current_app.config["PHEGET_DATA_DIR"],
            "gene.id.symbol.map.json.gz",
        ),
        "rb",
    ) as f:
        return json.loads(f.read().decode("utf-8"))


def get_dapg():
    """Return the file for DAP-G"""
    return os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        "GTEx_v8_finemapping_DAPG.sqlite.db",
    )
