# Setting up the data for PheGET

To set up the full database for PheGET, the user will need to download several files, then run two scripts. GNU make is required if using one of the make-based methods. All directories are relative to the base installation directory.

---

Please use the following steps if you are setting up PheGET for **REAL DATA** when you are **inside the University of Michigan Statistical Genetics cluster**:

**RECOMMENDED METHOD**:

(1) Enter the util directory. 

(2) While inside the util directory, run the following script:  <br>
`create.UM.statgen.links.sh`  <br>
This will symlink the data files and a gff3 file necessary for PheGET to function. **If you do this, you are done with setting up the data and do not need to continue onto the next steps. Please do not create or run the makefile.**

---

Alternate method for local testing

(1) Download **Homo_sapiens.GRCh38.97.chr.gff3.gz** to the **data** directory
- If you have access to the UM StatGen cluster, you can find this file at **'/net/amd/amkwong/browseQTL/all_chr/ensembl/Homo_sapiens.GRCh38.97.chr.gff3.gz'**
- This file can be found at 
**`ftp://ftp.ensembl.org/pub/release-97/gff3/homo_sapiens/Homo_sapiens.GRCh38.97.chr.gff3.gz`**
- As long as future releases retain the same formatting, they will still work, but the user will need to manually edit the value of the "ensemb" variable to match the new file name in generate.makefile.to.process.data.py

(2) Enter the **util** directory.

(4) Run the following command:  <br>
`python generate.makefile.to.process.data.py`  <br>
This creates a Makefile that can generate all necessary data files.

(5) Run make on the makefile `run.extract.Makefile`. You can run multiple jobs to speed up data processing. For example, if you want to run 8 parallel jobs, run the following command:  <br>
`make -k -j 8 -f run.extract.Makefile`

(6) Subset and download a small subset of a file for one of the chromosomes (for testing purposes). Below is an example that returns a single variant if you are within the UM StatGen cluster:
`tabix -h /net/amd/amkwong/browseQTL/all_chr/data/by_chromosome/chr19.All_Tissues.sorted.txt.gz chr19:6718376-6718377 | bgzip -c > test.file.txt.gz; tabix -c g -s 2 -b 3 -e 3 test.file.txt.gz`
Copy this file to your local machine.

(7) Copy your test file to the **data** directory and rename it with the appropriate chromosome number (for our example, we will rename our files to **chr19.All_Tissues.sorted.txt.gz** and **chr19.All_Tissues.sorted.txt.gz.tbi**

(8) Change the permission for these files to read-only to prevent accidental overwriting.

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
`python generate.makefile.to.process.data.py`  <br>
This will create the makefile used in the next step

(4) Run the following command (for 8 parallel jobs - feel free to change this number to match what's available on the computer):  <br>
`make -k -j 8 -f run.extract.Makefile`
This will create the rest of the data (from small test files, for all other chromosomes) and the databases needed to power gene symbol lookup

(5) Run the following command:  <br>
`python synthetic.data.py` <br>
This will create a set of synthetic eQTL data for chromosome 19 in the data directory

If everything ran correctly, then all the necessary data files will be generated in the data directory.
