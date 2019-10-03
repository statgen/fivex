# Setting up the data for PheGET

To set up the full database for PheGET, the user will need to download several files, then run two scripts. GNU make is required if using one of the make-based methods. All directories are relative to the base installation directory.

---

Please use the following steps if you are setting up PheGET for **REAL DATA** when you are **inside the University of Michigan Statistical Genetics cluster**:

**RECOMMENDED METHOD**:

(1) Enter the util directory. 

(2) While inside the util directory, run the following script:  <br>
`create.UM.statgen.links.sh`  <br>
This will symlink the data files and a gff3 file necessary for PheGET to function. **If you do this, you are done with setting up the data and do not need to continue onto the next steps.**

---

Alternate method:

(1) Enter the data directory.

(2) symlink (a) the ensembl Homo sapiens Build 38 genes file and (b) the procesed GTEx v8 data with the following commmands:  
<br>
`ln -s /net/amd/amkwong/browseQTL/all_chr/ensembl/Homo_sapiens.GRCh38.97.chr.gff3.gz ./`  <br>
`ln -s /net/amd/amkwong/browseQTL/all_chr/data/by_chromosome/chr*.All_Tissues.sorted.txt.gz* ./`  <br>

- (De novo method) If you wish to regenerate the data fresh from the original GTEx v8 data, use the following alternate step:
- (2a) Enter the data/temp directory and symlink the full GTEx v8 fastqtl data with the following command:  <br>
`ln -s /net/dumbo/home/xwen/ncbi/dbGaP-9060/gtex_v8_data/eqtl/fastqtl/*.allpairs.txt.gz ./`  <br>

(3) Enter the util directory. 

(4) Run the following command:  
`python generate.makefile.to.process.data.py`  
This creates a Makefile that can generate all necessary data files.

(5) Run make on the makefile `run.extract.Makefile`. You can run multiple jobs to speed up data processing. For example, if you want to run 8 parallel jobs, you can run the following command:  <br>
`make -k -j 8 -f run.extract.Makefile`

---

Please use the following steps if you want to set up **REAL DATA** when you are **not within the University of Michigan Statistical Genetics cluster**:

(1) Download **Homo_sapiens.GRCh38.97.chr.gff3.gz** to the data directory
- This file can be found at 
**`ftp://ftp.ensembl.org/pub/release-97/gff3/homo_sapiens/Homo_sapiens.GRCh38.97.chr.gff3.gz`**
- As long as future releases retain the same formatting, they will still work, but the user will need to manually edit the value of the "ensemb" variable to match the new file name in generate.makefile.to.process.data.py
 
(2) Download the full GTEx v8 results from dbGaP - specifically, all files within the gtex_v8_data/eqtl/fastqtl directory.
- These files should either be downloaded or symlinked to the data/temp directory. 
- Please note that the data/temp directory initially contains links to test data, which are contained in the data/sample directory. Delete these links before downloading or symlinking the full GTEx v8 files. If you simply wish to test the script, then you can continue on to step (3), which will generate a much smaller file.
- If the GTEx v8 results are at "/path/to/gtex", then you can generate symlinks by first entering the data/temp directory, then using the following command:  <br>
`ln -s /path/to/gtex/*.allpairs.txt.gz ./`
(replace /path/to/gtex/ with the actual path to the files)

(3) Enter the pheget/util directory.

(4) Run the following command:  <br>
`python generate.makefile.to.process.data.py`  <br>
This creates a Makefile that can generate all necessary data files.

(5) Run make on the makefile `run.extract.Makefile`. You can run multiple jobs to speed up data processing. For example, if you want to run 8 parallel jobs, run the following command:  <br>
`make -k -j 8 -f run.extract.Makefile`

---

Please use the following steps if you want to set up **SYNTHETIC DATA**:

(1) Either download or link **Homo_sapiens.GRCh38.97.chr.gff3.gz**, depending on whether you have access to the UM StatGen cluster

(2) Enter the util directory

(3) Run the following command:  <br>
`python synthetic.data.py` <br>
This will create a set of synthetic eQTL data for chromosome 19 in the data directory

(4) Run the following command:  <br> 
`python generate.makefile.to.process.data.py`  <br>
This will create the makefile used in the next step

(5) Run the following command (for 8 parallel jobs - feel free to change this number to match what's available on the computer):  <br>
`make -k -j 8 -f run.extract.Makefile`
This will create the rest of the data (from small test files, for all other chromosomes) and the databases needed to power gene symbol lookup


If everything ran correctly, then all the necessary data files will be generated in the data directory.
