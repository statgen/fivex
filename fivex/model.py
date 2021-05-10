"""
Models/ datastores
"""
import gzip
import json
import math
import os
import sqlite3

from flask import abort, current_app

# def locate_data(chrom):
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         f"{chrom}.All_Tissues.sorted.txt.gz",
#     )

#
def locate_data(chrom, startpos, datatype="ge"):
    start = math.floor(startpos / 1000000) * 1000000 + 1
    end = start + 999999
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        f"ebi_{datatype}",
        f"{chrom}",
        f"all.EBI.{datatype}.data.chr{chrom}.{start}-{end}.tsv.gz",
    )


# def locate_tissue_data(tissue):
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         f"{tissue}.allpairs.sorted.txt.gz",
#     )


def locate_study_tissue_data(study, tissue, datatype="ge"):
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "ebi_original",
        f"{datatype}",
        f"{study}",
        f"{study}_{datatype}_{tissue}.all.tsv.gz",
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


# def get_best_per_variant_lookup():
#     """Get the path to a file describing the best hits for a given variant"""
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         "best.genes.tissues.allele.info.rsnum.txt.gz",
#     )
# New version of this file (sqlite3 database) contains the following columns:
#  PIP (float), study_name, tissue_name, gene_ID, chromosome, position (int),
#  ref, alt, cluster_name (L1 or L2), cluster_size (int)
# We no longer need to look up rsid, allele frequency, allele count, or
#  total number of alleles from this file
def get_best_per_variant_lookup():
    """Get the path to an SQLite3 database file describing the best study,
    tissue, and gene for any given variant"""
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "credible_sets",
        "pip.best.variant.summary.sorted.indexed.sqlite3.db",
    )


def get_best_study_tissue_gene(chrom, start, end):
    conn = sqlite3.connect(get_best_per_variant_lookup())
    with conn:
        try:
            cursor = conn.cursor()
            (
                pip,
                study,
                tissue,
                gene_id,
                chrom,
                pos,
                ref,
                alt,
                cs_index,
                cs_size,
            ) = list(
                cursor.execute(
                    "SELECT * FROM sig WHERE chrom=? AND pos BETWEEN ? AND ? ORDER BY pip DESC LIMIT 1;",
                    (f"{chrom}", start, end),
                )
            )[
                0
            ]
            bestVar = (gene_id, chrom, pos, ref, alt, pip, study, tissue)
            return bestVar
        except IndexError:
            return abort(400)


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


# def get_dapg_path():
#     """Return the path to the DAP-G database"""
#     return os.path.join(
#         current_app.config["FIVEX_DATA_DIR"],
#         "GTEx_v8_finemapping_DAPG.sqlite.db",
#     )


# If requesting a single variant, then return the merged credible_sets file for a single chromosome
# Otherwise, return the study-specific, tissue-specific file that contains genomewide information
def get_credible_interval_path(chrom, study=None, tissue=None, datatype="ge"):
    if (study, tissue) == (None, None):
        return os.path.join(
            current_app.config["FIVEX_DATA_DIR"],
            "credible_sets",
            f"{datatype}",
            f"chr{chrom}.{datatype}.credible_set.tsv.gz",
        )
    else:
        return os.path.join(
            current_app.config["FIVEX_DATA_DIR"],
            "credible_sets",
            f"{datatype}",
            f"{study}",
            f"{study}.{tissue}_{datatype}.purity_filtered.sorted.txt.gz",
        )


# Return the chromosome-specific filename for the merged credible sets data
def get_credible_data_table(chrom, datatype="ge"):
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "credible_sets",
        f"chr{chrom}.{datatype}.credible_set.tsv.gz",
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
