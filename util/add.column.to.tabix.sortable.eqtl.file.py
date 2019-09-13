import gzip, subprocess, sqlite3, argparse

parser = argparse.ArgumentParser(description='Script for adding a gene symbol column to a tabix-sortable eQTL file')
parser.add_argument('-i','--infile', metavar="INFILE", type=str, help="Input file name", required=True)
parser.add_argument('-o','--outfile', metavar="OUTFILE", type=str, help="Output file name", required=True)
args = parser.parse_args()

# Default geneDB, created by makefile
geneDB = "../data/gene.chrom.pos.lookup.sqlite3.db"
conn = sqlite3.connect(geneDB)
c = conn.cursor()

# Read the entire sqlite3 databse into memory
c.execute("SELECT * FROM genelookup")
geneDict = dict()
for row in c:
    (gene_id, symbol, chrom, start, end, datatype) = row
    geneDict[gene_id] = symbol
conn.close()

# Directly pipe updated data into bgzip
with gzip.open(args.infile) as f, open(args.outfile,'w') as w:
    bgzip = subprocess.Popen(["bgzip","-c"], stdin=subprocess.PIPE, stdout=w)
    header = f.readline()
    bgzip.stdin.write( (header.rstrip('\n') + '\tsymbol\n').encode('utf-8') )
    for line in f:
        genetxt = line.rstrip('\n').split('\t')[0].split(".")[0]
        try:
            symbol = geneDict[genetxt]
        except:
            symbol = "unknown"
        bgzip.stdin.write( (line.rstrip('\n') + '\t' + symbol + '\n').encode('utf-8') )
    bgzip.communicate()
