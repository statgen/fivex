import glob
import os
import subprocess
import sys

# Indicates the number of megabases each chromosome has -- used for making merged files into 1MB chunks
chrDict = {
    "1": 249,
    "2": 243,
    "3": 199,
    "4": 191,
    "5": 182,
    "6": 171,
    "7": 160,
    "8": 146,
    "9": 139,
    "10": 134,
    "11": 136,
    "12": 134,
    "13": 115,
    "14": 108,
    "15": 102,
    "16": 91,
    "17": 84,
    "18": 81,
    "19": 59,
    "20": 65,
    "21": 47,
    "22": 51,
}

# omitted: 'X':157}

# The base directory containing EBI gene expression files.
# In the UM statgen cluster, the raw data can be found at "/net/1000g/hmkang/data/spot/"
# Generally, you will want to store the raw data at "{outDir}/ebi_original/"
rawDataDir = sys.argv[1]

# Output base directory for data
# On the UM statgen cluster, this can be found at "/net/amd/amkwong/browseQTL/v2_data/"
# Generally, you will want this to be set to FIVEx's base data directory, {FIVEX_DATA_DIR}
# typically located at {FIVEX_BASE_DIR}/data/
outDir = sys.argv[2]

# These are our default locations for supporting files and the default target data location
# The script should be located at {FIVEX_BASE_DIR}/util/merge.files.with.sorted.positions.py
scriptPath = "./merge.files.with.sorted.positions.py"
indexFile = os.path.join(outDir, "all_EBI_ge_data_index.tsv")
geDirectory = os.path.join(outDir, "ebi_ge")

# This is the shell command file to merge the data files
outputCommandFile = os.path.join(
    outDir, "extract.and.tabix.gene_expression.sh"
)

# Create index file for our merge.files.with.sorted.positions.py script
fileList = glob.glob(rawDataDir + "/*/ge/*.all.tsv.gz")
with open(indexFile, "w") as w:
    for line in fileList:
        filepath = line.rstrip("\n")
        tempSplit = os.path.basename(filepath).split(".")[0].split("_ge_")
        dataset = tempSplit[0]
        tissue = tempSplit[1]
        w.write(f"{dataset}\t{tissue}\t{filepath}\n")

# Generate commands to run merge.files.with.sorted.positions.py script, then tabix the results
with open(outputCommandFile, "w") as w:
    for chrom in chrDict:
        temp = subprocess.run(
            ["mkdir", "-p", os.path.join(geDirectory, chrom)]
        )
        for i in range(chrDict[chrom]):
            end = (i + 1) * 1000000
            start = (i * 1000000) + 1
            w.write(
                f"python3 {scriptPath} {indexFile} {chrom} {start} {end} {geDirectory}/{chrom}/all.EBI.ge.data.chr{chrom}.{start}-{end}.tsv.gz\n"
            )
    for chrom in chrDict:
        for i in range(chrDict[chrom]):
            end = (i + 1) * 1000000
            start = (i * 1000000) + 1
            w.write(
                f"tabix -s 4 -b 5 -e 5 {geDirectory}/{chrom}/all.EBI.ge.data.chr{chrom}.{start}-{end}.tsv.gz\n"
            )
