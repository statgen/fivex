import glob
import os

filelist = glob.glob("/net/1000g/hmkang/data/spot/*/ge/*.all.tsv.gz")
outIndex = "./all_EBI_ge_data_index.tsv"

with open(outIndex, "w") as w:
    for infile in filelist:
        study = infile.split("/")[-3]
        tissue = os.path.basename(infile).split(".")[0].split("_ge_")[-1]
        w.write(study + " " + tissue + " " + infile + "\n")
