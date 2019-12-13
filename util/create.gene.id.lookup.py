import argparse
import gzip
import json
import os

parser = argparse.ArgumentParser(
    description="Takes ID.only.gff.gz and creates a two-way lookup table for gene names and gene IDs"
)
parser.add_argument(
    "infile",
    metavar="INFILE",
    type=str,
    help="The full path to ID.only.gff.gz, created in the data generation pipeline from the ensembl homo sapiens reference",
)
parser.add_argument(
    "outfile",
    metavar="OUTFILE",
    type=str,
    help="Output file name (default: gene.id.symbol.map.json.gz)",
    default="gene.id.symbol.map.json.gz",
)

args = parser.parse_args()

if os.path.isfile(args.infile):
    dataDict = dict()
    with gzip.open(args.infile) as f:
        for line in f:
            (
                chrom,
                hav,
                temptype,
                begin,
                end,
                id1,
                strand,
                id2,
                infoFields,
            ) = line.rstrip("\n").split("\t")
            if chrom[0:3] != "chr":
                chrom = f"chr{chrom}"
            for field in infoFields.split(";"):
                (label, content) = field.split("=")
                if label == "ID":
                    (dataType, name) = content.split(":")
                elif label == "Name":
                    symbol = content
                elif label == "version":
                    version = content
            dataDict[
                name
            ] = symbol  # Look up a gene name using a long (ENSG#) name, with no version number
            dataDict[symbol] = f"{name}.{version}"

with gzip.open(args.outfile, "w") as w:
    w.write(json.dumps(dataDict))
