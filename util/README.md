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

Note: all examples below use gene expression ("ge") data. The sQTL data
generated with txrevise ("txrev") was processed the same way by replacing
instances of "ge" in path and file names with "txrev".

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
and tissues, sorted by chromosomal position. We then join p-values and other
fields from the raw supporting data, along with short gene names, using a second
script. This data will be used to support the tables at the bottom of the region
view page.

For step 1, since credible set files are smaller, we will combine the files
into chromosome-length chunks instead of 1 Mbps chunks. We will use the same
script (util/merge.files.with.sorted.positions.py) to combine the credible
sets data. To simplify this, we provide a script that generates commands to
both sort and combine the data:

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

The output files will be found in the following location:
 1. Sorted study- and tissue-specific files (final):
  {outDir}/credible_sets/ge/{study}/{study}.{tissue}_ge.purity_filtered.sorted.txt.gz
 2. Combined chromosome-specific files (intermediate):
  {outDir}/credible_sets/ge/temp/chr{chrom}.ge.credible_set.tsv.gz

For step 2, we will use join-spot-cred-marginal-add-genenames.py to join fields
from the raw data with the intermediate combined chromosome-specific files to
create the final joined files.

An example command for joining data into a credible sets file:
python3 join-spot-cred-marginal-add-genenames.py -a all.EBI.ge.data.chr1.1000001-2000000.tsv.gz -c chr1.ge.credible_set.tsv.gz -o ge.credible_set.joined.chr1.1000001-2000000.tsv.gz -r 1:1000001-2000000

-a: source raw data file containing the target data range
-c: source credible sets file
-o: target output joined credible sets file
-r: range, used by tabix to retrieve the desired region; usually corresponds to the range of the file specified by -a

The final joined, chromosome-long credible sets files should be placed here:
 {outDir}/credible_sets/ge/chr{chrom}.ge.credible_set.tsv.gz

---
Description of file formats

Note: {datatype} is currently either ge (for gene expression eQTL files)
or txrev (for txrevise sQTL files)
All files ending with .gz were compressed with bgzip and indexed with tabix

Raw Data:
  Study-specific Raw Data:
    Data file: data/ebi_original/{datatype}/{study}/{study}_{datatype}_{tissue}.all.tsv.gz
    File format: bgzipped and tabixed files, tab-separated data columns
      Column contents can be found in the definition for VariantParser, but without
      the study and tissue columns (because the file is study- and tissue-specific).
  Merged Raw Data:
    Data file: data/ebi_{datatype}/{chromosome}/all.EBI.{datatype}.data.chr{chrom}.{start}-{end}.tsv.gz
    File format: bgzipped and tabixed files, tab-separated data columns
      Column contents can be found in the definition for VariantParser, with study
      and tissue as the first two columns.

Credible Sets Data:
  Study-specific data:
    Data file: data/credible_sets/{datatype}/{study}/{study}.{tissue}_{datatype}.purity_filtered.sorted.txt.gz
    Note: contains a header line starting with "#"
    File format: bgzipped and tabixed files, tab-separated data columns
                 first sorted by chromosome, then by position.
      Column contents: phenotype_id, variant_id, chr, pos, ref, alt, cs_id,
         cs_index, finemapped_region, pip, z, cs_min_r2, cs_avg_r2, cs_size,
         posterior_mean, posterior_sd, cs_log10bf
  Joined and merged data:
    Data file: data/credible_sets/{datatype}/chr{chrom}.{datatype}.credible_set.tsv.gz
    File format: bgzipped and tabixed files, tab-separated data columns
    Column contents: begins with columns for study and tissue, then the same
      columns as study-specific data, then extra columns joined from raw data
      (can be found in the definition of CIParser):
      ma_samples, maf, pvalue, beta, se, type, ac, an, r2, mol_trait_obj_id,
      gid (geneID), median_tpm, rsid, gene_symbol (e.g. "SORT1")

Supporting database files:
  data/gene.id.symbol.map.json.gz
  File format: a JSON file containing two-way mappings between common gene
               names and Ensembl GeneIDs.

  Note: Currently, when Ensembl GeneIDs are used as the key, it does not
  contain version numbers; when common gene names are used as the key, the
  target GeneID values do contain version numbers. Since none of EBI's genes
  contain version numbers, the version numbers can safely be removed.

  data/rsid.sqlite3.db
  File format: sqlite3 database containing a single table "rsidTable"
    data columns within the table are:
    chrom (TEXT), pos (INTEGER), ref (TEXT), alt (TEXT), rsid (TEXT)
   Indexed on both (chrom, pos) and (rsid)
   Intended for rsid lookup using chrom and pos

  data/credible_sets/{datatype}/pip.best.variant.summary.sorted.indexed.sqlite3.db
  File format: sqlite3 database containing a single table "sig"
    data columns within the table are:
    pip (REAL), study (TEXT), tissue (TEXT), gene_id (TEXT), chrom (TEXT),
    pos (INTEGER), ref (TEXT), alt (TEXT), cs_index (TEXT), cs_size (INTEGER)
  Indexed on (chrom, pos), (study, tissue), and (gene_id)
  Contains the "best" data point at each variant by a simple heuristic:
  (1) has the strongest PIP signal, and (2) if there is a tie, the point with
  the most significant P-value

  data/gencode/gencode.v30.annotation.gtf.genes.bed.gz
  data/gencode/gencode.v30.annotation.gtf.transcripts.bed.gz
  File format: bgzipped and tabixed subsets of raw gencode files
  The third column indicates the data type of each line:
  - The "genes" file contains "gene" as the 3rd field
  - The "transcripts" file contains "transcript" as the 3rd field
  Column values for genes file:
    chrom, data_source, information_category,
    start, end, strand (+ or -), geneID, gene_type, gene_name
  Column values for transcripts file:
    chrom, data_source, information_category,
    start, end, strand, gene_id, transcript_id, gene_type, gene_name,
    transcript_type, transcript_name

data/gencode/tss.json.gz
File format: a JSON file mapping both geneIDs and gene names to transcription
start site positions. Positive values for positions indicate a forward
transcription direction (+ strand), while negative values indicate a backwards
transcription direction (- strand). This information is used to calculate
the distance between a variant and the TSS of surrounding genes.