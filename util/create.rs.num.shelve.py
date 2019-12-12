# Create a Python shelve to look up variants by chr:pos:ref:alt to find rs numbers
import argparse
import gzip
import shelve

parser = argparse.ArgumentParser(
    description="Create a Python shelve file for rs number lookup"
)
parser.add_argument(
    "infile",
    metavar="INFILE",
    type=str,
    help="Input file from GTEx v8 (lookup table)",
)
parser.add_argument(
    "outfile",
    metavar="OUTFILE",
    type=str,
    help="Output file name (Python shelve)",
)

args = parser.parse_args()
with shelve.open(args.outfile) as s, gzip.open(args.infile) as f:
    for line in f:
        (b38pos, chrom, pos, ref, alt, naps, rsnum, b37pos) = line.rstrip(
            "\n"
        ).split("\t")
        if rsnum != ".":
            s[":".join([chrom, pos, ref, alt])] = rsnum
