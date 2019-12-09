# Replace db_name and row_gen database names, use argparse with default values instead
# rows: gene_id, chr, pos, ref, alt, pval, tissue
import argparse
import sqlite3

parser = argparse.ArgumentParser(
    description="Saves significant variants in an sqlite3 database for lookup"
)
parser.add_argument(
    "infile", metavar="INFILE", type=str, help="Input file name"
)
parser.add_argument(
    "outfile", metavar="OUTFILE", type=str, help="Output file name"
)

args = parser.parse_args()

conn = sqlite3.connect(args.outfile)


def row_gen():
    with open(args.infile) as f:
        for line in f:
            (gene_id, chrom, pos, ref, alt, pval, tissue) = line.rstrip(
                "\n"
            ).split("\t")
            yield (gene_id, chrom, int(pos), ref, alt, float(pval), tissue)


with conn:
    conn.execute(
        "create table sig (gene_id TEXT, chrom TEXT, pos INT, ref TEXT, alt TEXT, pval REAL, tissue TEXT)"
    )
    conn.executemany("INSERT INTO sig VALUES (?,?,?,?,?,?,?)", row_gen())
