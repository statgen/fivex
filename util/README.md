# Setting up FIVEx for multiple datasets (EBI) 

FIVEx eQTL browser for multiple studies

Notes and instructions for generating supporting data

---
Introduction

FIVEx presents data from an extensive collection of eQTLs from the EBI eQTL
Catalogue (https://www.ebi.ac.uk/eqtl/). Supporting data can be downloaded
from the EBI directly via ftp (ftp://ftp.ebi.ac.uk/pub/databases/spot/eQTL/csv/
for eQTL data, ftp://ftp.ebi.ac.uk/pub/databases/spot/eQTL/credible_sets/
for credible set data). We wrote FIVEx to use the tabix-compatible bgzipped
tab-delimited file format.

FIVEx features two views of eQTL data: 
 - A single variant view, which shows the effect that variant has on the
   expression of nearby genes (defined as genes whose transcription start
   sites [TSS] are within one million base pairs [bps] of that variant)
   in all tested tissues
 - A regional view, which shows the effect of variants within a region on
   the expression of a specific gene within a given tissue


---
Supporting Data

FIVEx's regional view uses data directly from the eQTL Catalogue.
Study- and tissue-specific data need to be placed in the data directory,
in the following location:

 {DATA_DIR}/ebi_original/{STUDY}/ge/{STUDY}_ge_{TISSUE}.all.tsv.gz

where {DATA_DIR} is the base data directory for FIVEx, {STUDY} is the name
of the study, and {TISSUE} is the name of the tissue.

FIVEx's single-variant view requires data files containing all studies and
tissues, split into 1 Mbps chunks. These combined study- and tissue-specific
files can be generated using the following utility script, which takes
multiple sorted study- and tissue-specific files and combined them into one
sorted all-studies, all-tissues file, subsetted to a given range:

 util/merge.files.with.sorted.positions.py

This script takes 6 arguments as input, 5 of which are mandatory:

 1. indexf: a whitespace-delimited index file containing information on all
            study- and tissue-specific files. The file should be in the
            following format, with one file listed per line
            [dataset_name] [tissue_name] [filename]
 2. chrom: chromosome to subset -- used in tabix-based data retrieval
 3. beg: beginning position of the extraction range -- used in tabix-based
         data retrieval
 4. end: ending position of the extraction range -- used in tabix-based data
         retrieval
 5. outf: output file name for the merged file
 6. (optional) posIdx: column number (0-based, so the first column is 0,
                       second column is 1, etc.) containing genomic position.
                       Default = 2 (corresponding to the format of the eQTL
                       Catalogue's gene expression data). Please note that the
                       credible_sets files have their genomic positions in the
                       fourth column (posIdx = 3).

To create the necessary supporting dataset, you will need to create an index
file listing all the study- and tissue-specific files (see 1. above). Then,
you will need to run the merging script on each 1Mbp chunk and save the output
to the following directory:

 {DATA_DIR}/ebi_ge/{CHROM}/all.EBI.ge.data.chr{CHROM}.{START}-{END}.tsv.gz

where {CHROM} is the chromosome name, {START} is the start position, and
{END} is the end position. We require the {START} positions to be exactly
(n*1000000) + 1, where n is a non-negative integer, while the corresponding
{END} positions must be (n+1) * 1000000.

To simplify this process, we created a supporting Python script to generate
shell commands to run the merging script:

 util/generate.commands.to.merge.EBI.gene.expressions.py

This script takes in two arguments:

 1. rawDataDir: the directory containing raw data downloaded from the
                eQTL Catalogue. This should be located at
                {DATA_DIR}/ebi_original/
 2. outDir: the data directory for FIVEx. This should be set to
            {DATA_DIR}

This script requires you to create an index file and place it at

 {outDir}/all_EBI_ge_data_index.tsv

to function correctly.

Running this script will generate the following shell script file:

 extract.and.tabix.gene_expressions.sh

These commands will generate combined study- and tissue-specific data files
to support FIVEx's single variant view. Please note that these commands can be
run in parallel.


---
Credible Sets data

EBI credible sets data contain analysis results from the Sum of Single Effects
method (SuSiE, https://stephenslab.github.io/susie-paper/index.html). Similar
to the eQTL data, our single-variant and regional views use different files.
Unlike the eQTL data, the raw data is unsorted and needs to be processed to be
used in both single-variant and regional views. 

FIVEx's regional view uses credible sets data in sorted format.
Single-variant view requires credible sets data to be combined across studies
and tissues, sorted by chromosomal position.

Since credible set files are smaller, we will combine the files into 
chromosome-length chunks instead of 1 Mbps chunks. We will use the same script
(util/merge.files.with.sorted.positions.py) to combine the credible sets data.

To simplify this, we provide a script that generates commands to both sort and
combine the data:

 util/generate.commands.to.merge.EBI.credible_sets.py

This script takes in two arguments:

 1. rawDataDir: the directory holding the raw downloaded credible_sets data.
                Data from all different studies and tissues should be stored
                in this directory directly, not inside subdirectories.
 2. outDir: FIVEx's data directory {DATA_DIR}. The script will generate the
            necessary subdirectories inside this directory.

This will generate a command file that will perform the following tasks:

 1. Create the directory structure necessary to hold the output
 2. Sort raw files and save them as study- and tissue-specific data files
    to be used in our region view
 3. Extract and combine sorted files, one chromosome at a time, to be used
    in our single variant view

This command file should be run from inside the util/ directory.

The output files will be found in the following locations:
 1. Sorted study- and tissue-specific files:
  {outDir}/credible_sets/{study}/{study}.{tissue}_ge.purity_filtered.sorted.txt.gz
 2. Combined chromosome-specific files:
  {outDir}/credible_sets/chr{chrom}.ge.credible_set.tsv.gz

If you prefer to manually process the files, you will need to do the following:

1. For each raw credible_sets data file, sort it by chromosome and position, then
   bgzip and tabix the results. You must retain a header line for this file.
2. Combine the sorted credible_sets files into chromosome-specific chunks,
   prepend study and tissue as data columns, then bgzip and tabix the results.
   These files do not have a header line.
3. Place the resulting files at the following locations:
    a. Sorted study- and tissue-specific files: {DATA_DIR}/credible_sets/{STUDY}/
    b. Combined chromosome-specific chunks: {DATA_DIR}/credible_sets/
