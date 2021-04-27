import glob
import os
import sys

# List of chromosomes
chrList = range(1, 23)

# The base directory containing EBI credible_sets files.
# Please note that the raw downloaded files are not sorted by position,
# and need to be sorted before they can be combined
# In the UM statgen cluster, the raw data can be found here:
#  /net/1000g/hmkang/data/spot/credible_sets/raw/
rawDataDir = sys.argv[1]

# Output base directory for data
# On the UM statgen cluster, this can be found at:
#  /net/amd/amkwong/browseQTL/v2_data/credible_sets/
# Generally, you will want this to be set to FIVEx's base data directory,
#  {FIVEX_DATA_DIR}
# typically located at {FIVEX_BASE_DIR}/credible_sets/
# The sorted data should be located at "{outDir}/credible_sets/"
# Study- and tissue-specific files should be located inside their own
# directories inside credible_sets, while the combined data should be
# directly in credible_sets
outDir = sys.argv[2]

# These are our default locations for supporting files and the default target data location
# The script should be located at {FIVEX_BASE_DIR}/util/merge.files.with.sorted.positions.py
scriptPath = "./merge.files.with.sorted.positions.py"
indexFile = os.path.join(outDir, "all_EBI_credible_sets_data_index.tsv")
csDirectory = os.path.join(outDir, "credible_sets")

# This is the shell command file to sort, merge, and tabix the data files
outputCommandFile = os.path.join(outDir,
    "sort.extract.and.tabix.credible_sets.sh"
)

# Create index file for our merge.files.with.sorted.positions.py script
fileList = glob.glob(os.path.join(rawDataDir, "*_ge.purity_filtered.txt.gz"))

# raw file names are in the format {study}.{tissue}_ge.purity_filtered.txt.gz
sortedFilelist = list()
with open(outputCommandFile, "w") as w, open(indexFile, "w") as wi:
    for filepath in fileList:
        dataset = os.path.basename(filepath).split(".")[0]
        studydir = os.path.join(csDirectory, dataset)
        outfile = os.path.join(
            studydir,
            os.path.basename(filepath).replace(
                "purity_filtered.txt.gz",
                "purity_filtered.sorted.txt.gz"
            ),
        )
        sortedFilelist.append(outfile)
        w.write(
            f"mkdir -p {studydir}\n( ( echo -n '#' ; zcat {filepath} | head -n 1 ) ; zcat {filepath} | tail -n +2 | sort -k3,3V -k4,4n ) | bgzip -c > {outfile}\ntabix -s 3 -b 4 -e 4 {outfile}\n"
        )

    for sortedFile in sortedFilelist:
        tempSplit = (
            os.path.basename(sortedFile)
            .replace("_ge.purity_filtered.sorted.txt.gz", "")
            .split(".")
        )
        dataset = tempSplit[0]
        tissue = tempSplit[1]
        wi.write(f"{dataset}\t{tissue}\t{sortedFile}\n")

# Generate commands to run merge.files.with.sorted.positions.py script, then tabix the results
with open(outputCommandFile, "a") as w:
    for chrom in chrList:
        w.write(
            f"python3 {scriptPath} {indexFile} {chrom} 1 ' ' {csDirectory}/chr{chrom}.ge.credible_set.tsv.gz 3\n"
        )
        w.write(
            f"tabix -s 5 -b 6 -e 6 {csDirectory}/chr{chrom}.ge.credible_set.tsv.gz\n"
        )
