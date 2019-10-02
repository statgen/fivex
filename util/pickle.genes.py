# Create a database of gene names, gene symbols, beginning, and end
import gzip, pickle, argparse

parser = argparse.ArgumentParser(description='Creates a Python pickle of a gene name to gene symbol dictionary')
parser.add_argument('-i','--infile', type=str, required=True)
args = parser.parse_args()
dataDict = dict()

with gzip.open(args.infile,'rb') as f:
    for line in f:
        (chrom,hav,temptype,begin,end,id1,strand,id2,infoFields) = line.decode('utf-8').rstrip('\n').split('\t')
        chrom = "chr" + chrom
        for field in infoFields.split(";"):
            (label,content) = field.split("=")
            if label=="ID":
                (dataType,name) = content.split(":")
            elif label=="Name":
                symbol = content

        dataDict[name] = symbol

with open("./gene.symbol.pickle","wb") as w:
    pickle.dump(dataDict, w, pickle.HIGHEST_PROTOCOL)
