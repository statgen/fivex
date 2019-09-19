# Setting up the data for PheGET

To set up the full database for PheGET, the user will need to download several files, then run two scripts. GNU make is required. All directories are relative to the base installation directory.

Please use the following steps if you are setting up PheGET inside the University of Michigan Statistical Genetics cluster:

(1) Enter the data directory and symlink the ensembl Homo sapiens Build 38 genes file with the following commmand:
ln -s /net/amd/amkwong/browseQTL/all_chr/ensembl/Homo_sapiens.GRCh38.97.chr.gff3.gz ./

(2) While still in the data directory, symlink the fully-processed chromosome-specific, all-tissues data with the following commands:
ln -s /net/amd/amkwong/browseQTL/all_chr/data/by_chromosome/chr*.All_Tissues.sorted.txt.gz* ./

- (Alternate method) If you wish to generate the data fresh from the original GTEx v8 data, use the following alternate step:
- (2a) Enter the data/temp directory and symlink the full GTEx v8 fastqtl data with the following command:
ln -s /net/dumbo/home/xwen/ncbi/dbGaP-9060/gtex_v8_data/eqtl/fastqtl/*.allpairs.txt.gz ./

(3) Enter the util directory.

(4) Run "python generate.makefile.to.process.data.py". This creates a Makefile that can generate all necessary data files.

(5) Run the makefile "run.extract.Makefile". You can run multiple jobs to speed up data processing. For example, if you want to run 8 parallel jobs, run "make -k -j 8 -f run.extract.Makefile".


Please use the following steps if you are not within the University of Michigan Statistical Genetics cluster:

(1) Download Homo_sapiens.GRCh38.97.chr.gff3.gz to the data directory
- This file can be found at 
ftp://ftp.ensembl.org/pub/release-97/gff3/homo_sapiens/Homo_sapiens.GRCh38.97.chr.gff3.gz
- As long as future releases retain the same formatting, they will still work, but the user will need to manually edit the value of the "ensemb" variable to match the new file name in generate.makefile.to.process.data.py
 
(2) Download the full GTEx v8 results from dbGaP - specifically, all files within the gtex_v8_data/eqtl/fastqtl directory.
- These files should either be downloaded or symlinked to the data/temp directory. 
- Please note that the data/temp directory initially contains links to test data, which are contained in the data/sample directory. Delete these links before downloading or symlinking the full GTEx v8 files. If you simply wish to test the script, then you can continue on to step (3), which will generate a much smaller file.
- If the GTEx v8 results are at "/path/to/gtex", then you can generate symlinks by first entering the data/temp directory, then using the following command: 
ln -s /path/to/gtex/*.allpairs.txt.gz ./

(3) Enter the pheget/util directory.

(4) Run "python generate.makefile.to.process.data.py". This creates a Makefile that can generate all necessary data files.

(5) Run the makefile "run.extract.Makefile". You can run multiple jobs to speed up data processing. For example, if you want to run 8 parallel jobs, run "make -k -j 8 -f run.extract.Makefile".


If everything ran correctly, then all the necessary data files will be generated in the data directory.
