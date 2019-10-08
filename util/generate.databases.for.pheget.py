# Create a database of gene names, gene symbols, beginning, and end
import argparse
import gzip
import pickle
import sqlite3

parser = argparse.ArgumentParser(
    description="Generates an sqlite3 database which can be used to match gene names to gene symbols and genomic position ranges")  # noqa
parser.add_argument('-i', '--infile', metavar="INFILE", type=str, default='../data/ID.only.gff.gz',
                    help="Input filtered gff3 file name (exons removed)")
parser.add_argument('-o', '--outDB', metavar="OUTDB", type=str, default='../data/gene.chrom.pos.lookup.sqlite3.db',
                    help='Output sqlite3 database file name')
parser.add_argument('-p', '--outPickle', metavar="OUTPICKLE", type=str, default='../data/gene.symbol.pickle',
                    help='Output Python pickle object for gene name to symbol lookup')

args = parser.parse_args()

geneDB = args.outDB
dataDict = dict()

conn = sqlite3.connect(geneDB)
c = conn.cursor()
c.execute(
    "CREATE TABLE IF NOT EXISTS genelookup(gene_id text PRIMARY KEY, symbol text, chrom text, startpos int, endpos int, type text)")  # noqa

with gzip.open(args.infile) as f:
    for line in f:
        (chrom, hav, temptype, begin, end, id1, strand, id2, infoFields) = line.decode('utf-8').rstrip('\n').split('\t')
        chrom = "chr" + chrom
        for field in infoFields.split(";"):
            (label, content) = field.split("=")
            if label == "ID":
                (dataType, name) = content.split(":")
            elif label == "Name":
                symbol = content
                dataDict[name] = symbol  # ID always comes before symbol
        c.execute("INSERT OR REPLACE INTO genelookup VALUES (?,?,?,?,?,?)", (name, symbol, chrom, begin, end, dataType))
conn.commit()
conn.close()

with open(args.outPickle, "wb") as w:
    pickle.dump(dataDict, w, pickle.HIGHEST_PROTOCOL)
