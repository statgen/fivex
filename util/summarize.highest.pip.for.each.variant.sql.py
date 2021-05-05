import glob
import gzip
import os
import sqlite3
import sys

csdir = sys.argv[1]
outfile = sys.argv[2]

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
    glob.glob(os.path.join(csdir, "chr*.ge.credible_set.tsv.gz")), key=chrnum
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
        ) = (line.decode('utf-8').rstrip('\n').split())
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
        ]
    except:
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
        ]


# We will create an SQLite3 database to hold searchable best variant database
# Column values are: PIP (float), study_name, tissue_name, gene_ID, chromosome, position (int), ref, alt, cluster_name (L1 or L2), cluster_size (int)
# We want to index by chromosome, position, study_name, tissue_name, and gene_ID

conn = sqlite3.connect(outfile)
with conn:
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS sig")
    cursor.execute(
        "CREATE TABLE sig (pip REAL, study TEXT, tissue TEXT, gene_id TEXT, chrom TEXT, pos INTEGER, ref TEXT, alt TEXT, cs_index TEXT, cs_size INTEGER)"
    )
    for infile in filelist:
        with gzip.open(infile) as f:
            line = f.readline()
            bestList = parseline(line)
            for line in f:
                currentList = parseline(line)
                if bestList[4:8] == currentList[4:8]:
                    if bestList[0] > currentList[0]:
                        bestList = currentList
                else:
                    cursor.execute(
                        "INSERT INTO sig VALUES (?,?,?,?,?,?,?,?,?,?)",
                        tuple(bestList),
                    )
                    bestList = currentList
            cursor.execute(
                "INSERT INTO sig VALUES (?,?,?,?,?,?,?,?,?,?)", tuple(bestList)
            )
    cursor.execute("CREATE INDEX idx_chrom_pos ON sig (chrom, pos)")
    cursor.execute("CREATE INDEX idx_study_tissue ON sig(study, tissue)")
    cursor.execute("CREATE INDEX idx_gene on sig(gene_id)")
    conn.commit()
