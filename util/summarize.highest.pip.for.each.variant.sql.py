import glob
import gzip
import os
import sqlite3
import sys

# Input arguments:
# csdir: directory containing merged confidence interval data
#  Note: we will now use confidence interval data which has been joined with the raw QTL points data to add p-values
# datatype: type of data ("ge", "txrev", etc.) - in case of mixed data type in the source directory
# outfile: output sqlite3 database file - default name should be:
# pip.best.variant.summary.sorted.indexed.sqlite3.db
csdir = sys.argv[1]
datatype = sys.argv[2]
outfile = sys.argv[3]

# Sorting function for file names that start with chr*
# Usage:
# y = sorted(x, key=chrnum)
def chrnum(txt):
    additionalChr = {"x": 23, "y": 24, "mt": 25}
    chrom = os.path.basename(txt).split(".")[0].replace("chr", "")
    if chrom.lower() in additionalChr:
        chrom = additionalChr[chrom.lower()]
    return int(chrom)


filelist = sorted(
    glob.glob(os.path.join(csdir, f"chr*.{datatype}.credible_set.tsv.gz")),
    key=chrnum,
)


def parseline(line):
    try:
        (
            study,
            tissue,
            phenotype_id,
            variant_id,
            chrom,
            pos,
            ref,
            alt,
            cs_id,
            cs_index,
            finemapped_region,
            pip,
            z,
            cs_min_r2,
            cs_avg_r2,
            cs_size,
            posterior_mean,
            posterior_sd,
            cs_log10bf,
            # additional data joined in from full QTL files
            ma_samples,
            maf,
            pvalue,
            beta,
            se,
            vtype,
            ac,
            an,
            r2,
            mol_trait_obj_id,
            gid,
            median_tpm,
            rsid,
            genesymbol,
        ) = line.rstrip("\n").split()
        return [
            float(pip),
            study,
            tissue,
            phenotype_id,
            chrom,
            int(pos),
            ref,
            alt,
            cs_index,
            int(cs_size),
            # additional data joined in from full QTL files
            float(pvalue),
        ]
    except ValueError:
        return [
            0.0,
            "NO_STUDY",
            "NO_TISSUE",
            "NO_GENE",
            "NO_CHR",
            0,
            "NO_REF",
            "NO_ALT",
            "L0",
            0,
            1.0,
        ]


# We will create an SQLite3 database to hold searchable best variant database
# Column values are: PIP (float), study_name, tissue_name, gene_ID, chromosome, position (int), ref, alt, cluster_name (L1 or L2), cluster_size (int)
# We want to index by chromosome, position, study_name, tissue_name, and gene_ID

conn = sqlite3.connect(outfile)
with conn:
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS sig")
    cursor.execute(
        "CREATE TABLE sig (pip REAL, study TEXT, tissue TEXT, gene_id TEXT, chrom TEXT, pos INTEGER, ref TEXT, alt TEXT, cs_index TEXT, cs_size INTEGER, pvalue REAL)"
    )
    for infile in filelist:
        with gzip.open(infile, "rt") as f:
            # Parse the first line and use it as the current best data point
            line = f.readline()
            bestList = parseline(line)
            # Parse subsequent lines and compare PIPs, and if there is a tie, P-values
            for line in f:
                currentList = parseline(line)
                # If chr:pos:ref:alt is the same as the current point, compare and update best point if needed
                if bestList[4:8] == currentList[4:8]:
                    # If the current PIP is higher than the best PIP value so far, then use the new point
                    if bestList[0] < currentList[0]:
                        bestList = currentList
                    # If the PIP ties the best so far, compare P-values as a tie-break and choose the more significant one
                    elif bestList[0] == currentList[0]:
                        if bestList[10] > currentList[10]:
                            bestList = currentList
                # If chr:pos:ref:alt is different, store the best value for the previous variant and set the new variant as the current one
                else:
                    cursor.execute(
                        "INSERT INTO sig VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        tuple(bestList),
                    )
                    bestList = currentList
            # End of file - store the final best variant
            cursor.execute(
                "INSERT INTO sig VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                tuple(bestList),
            )
    cursor.execute("CREATE INDEX idx_chrom_pos ON sig (chrom, pos)")
    cursor.execute("CREATE INDEX idx_study_tissue ON sig(study, tissue)")
    cursor.execute("CREATE INDEX idx_gene on sig(gene_id)")
    conn.commit()
