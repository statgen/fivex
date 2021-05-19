"""
Models/ datastores
"""
import gzip
import json
import math
import os
import sqlite3

from flask import abort, current_app


# Merged data split into 1Mbps chunks - only query this for single variant data
def locate_data(chrom, startpos, datatype="ge"):
    start = math.floor(startpos / 1000000) * 1000000 + 1
    end = start + 999999
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        f"ebi_{datatype}",
        f"{chrom}",
        f"all.EBI.{datatype}.data.chr{chrom}.{start}-{end}.tsv.gz",
    )


# Study- and tissue-specific data - query this for region view
def locate_study_tissue_data(study, tissue, datatype="ge"):
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "ebi_original",
        f"{datatype}",
        f"{study}",
        f"{study}_{datatype}_{tissue}.all.tsv.gz",
    )


# Signed tss data: positive TSS = Plus strand, negative TSS = Minus strand
def locate_tss_data():
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"], "gencode", "tss.json.gz",
    )


# Sorted and filtered gencode data
def locate_gencode_data():
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "gencode",
        "gencode.v30.annotation.gtf.genes.bed.gz",
    )


# A database that stores the point with the highest PIP at each variant
def get_best_per_variant_lookup():
    """Get the path to an SQLite3 database file describing the best study,
    tissue, and gene for any given variant"""
    return os.path.join(
        current_app.config["FIVEX_DATA_DIR"],
        "credible_sets",
        current_app.config["DATATYPE"],
        "pip.best.variant.summary.sorted.indexed.sqlite3.db",
    )


# Uses the database above to find the data point with highest PIP value
def get_best_study_tissue_gene(
    chrom, start=None, end=None, study=None, tissue=None, gene_id=None
):
    conn = sqlite3.connect(get_best_per_variant_lookup())
    with conn:
        try:
            cursor = conn.cursor()
            sqlCommand = "SELECT * FROM sig WHERE chrom=?"
            argsList = [f"{chrom}"]
            if start is not None:
                if end is not None:
                    sqlCommand += " AND pos BETWEEN ? AND ?"
                    argsList.extend([f"{start}", f"{end}"])
                else:
                    sqlCommand += " AND pos=?"
                    argsList.append(f"{start}")
            if study is not None:
                sqlCommand += " AND study=?"
                argsList.append(f"{study}")
            if tissue is not None:
                sqlCommand += " AND tissue=?"
                argsList.append(f"{tissue}")
            if gene_id is not None:
                sqlCommand += " AND gene_id=?"
                argsList.append(f"{gene_id}")
            sqlCommand += " ORDER BY pip DESC LIMIT 1"
            (pip, study, tissue, gene_id, chrom, pos, ref, alt, _, _,) = list(
                cursor.execute(sqlCommand, tuple(argsList),)
            )[0]
            bestVar = (gene_id, chrom, pos, ref, alt, pip, study, tissue)
            return bestVar
        except IndexError:
            return abort(400)


def get_gene_names_conversion():
    """Get the compressed file containing two-way mappings of gene_id to gene_symbol"""
    with gzip.open(
        os.path.join(
            current_app.config["FIVEX_DATA_DIR"], "gene.id.symbol.map.json.gz",
        ),
        "rb",
    ) as f:
        return json.loads(f.read().decode("utf-8"))


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
        f"{datatype}",
        f"chr{chrom}.{datatype}.credible_set.tsv.gz",
    )


# Takes in chromosome and position, and returns (chrom, pos, ref, alt, rsid)
# rsid.sqlite3.db is created by util/create.rsid.sqlite3.py
def return_rsid(chrom, pos):
    rsid_db = os.path.join(
        current_app.config["FIVEX_DATA_DIR"], "rsid.sqlite3.db"
    )
    conn = sqlite3.connect(rsid_db)
    with conn:
        try:
            cursor = conn.cursor()
            return list(
                cursor.execute(
                    "SELECT * FROM rsidTable WHERE chrom=? AND pos=?",
                    (f"{chrom}", pos),
                )
            )[0]
        except ValueError:
            return [f"{chrom}", pos, "N", "N", "Unknown"]
