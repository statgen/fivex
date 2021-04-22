import gzip
import json

# Extract transcript start site information from the file containing GENCODE gene information
# Also encodes the strand information as the sign of the TSS:
# a TSS on the + strand is recorded as a positive TSS, while
# a TSS on the - strand is recorded as a negative TSS
tssDict = dict()
with gzip.open('gencode.v30.annotation.gtf.genes.bed.gz', 'r') as f:
    for line in f:
        temp = line.decode('utf-8').rstrip('\n').split()
        if len(temp) == 9:
            (chrom, dataSource, dataType, start, end, strand, geneID, geneType, geneSymbol) = temp
            if strand == '+':
                tss = int(start)
            elif strand == '-':
                tss = -1 * int(end)
            else:
                tss = -1
            tssDict[geneSymbol] = tss
            tssDict[geneID.split(".")[0]] = tss
with gzip.open('tss.json.gz', 'wb') as w:
   w.write(json.dumps(tssDict, separators=(',',':')).encode('utf-8'))
