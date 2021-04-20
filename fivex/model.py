"""
Models/ datastores
"""
import gzip
import json
import math
import os

from flask import current_app

# def locate_data(chrom):
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         f"{chrom}.All_Tissues.sorted.txt.gz",
#     )

#
def locate_data(chrom, startpos):
    start = math.floor(startpos / 1000000) * 1000000 + 1
    end = start + 999999
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "ebi_ge",
        f"{chrom}",
        f"all.EBI.ge.data.chr{chrom}.{start}-{end}.tsv.gz",
    )


# def locate_tissue_data(tissue):
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         f"{tissue}.allpairs.sorted.txt.gz",
#     )


def locate_study_tissue_data(study, tissue):
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "ebi_original",
        f"{study}",
        "ge",
        f"{study}_ge_{tissue}.all.tsv.gz",
    )


# def locate_tissue_to_system():
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         "tissue.to.system.json.gz",
#     )


def locate_tss_data():
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"], "gencode", "tss.json.gz",
    )


def get_best_per_variant_lookup():
    """Get the path to a file describing the best hits for a given variant"""
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "best.genes.tissues.allele.info.rsnum.txt.gz",
    )


def get_sig_lookup():
    """Get the path to an sqlite3 database file containing some data for eQTLs more significant than 1e-5"""
    return os.path.join(current_app.config["FIVEX_DATA_DIR"], "sig.lookup.db",)


def get_gene_names_conversion():
    """Get the compressed file containing two-way mappings of gene_id to gene_symbol"""
    with gzip.open(
        os.path.join(
            current_app.config["FIVEX_DATA_DIR"], "gene.id.symbol.map.json.gz",
        ),
        "rb",
    ) as f:
        return json.loads(f.read().decode("utf-8"))


def get_dapg_path():
    """Return the path to the DAP-G database"""
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "GTEx_v8_finemapping_DAPG.sqlite.db",
    )


def get_gene_data_table(gene_id):
    """
    Returns the path to the data to populate the table in region view
    Required source data can be found in eqtl.pip.data.for.region.table.tar,
    in the form of 35379 gene-specific data files, which need to be placed
    in data/piptables/
    """
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "piptables",
        f"{gene_id}.eqtl.pip.txt.gz",
    )
