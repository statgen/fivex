import glob, subprocess, os

#############################################
# Specify input and output directories here #
#############################################
# If you are working from within the UM StatGen cluster, and you wish to fully process the data from the raw source,
# you can use the following path to the full data set from GTEx v8
#filelist = glob.glob("/net/dumbo/home/xwen/ncbi/dbGaP-9060/gtex_v8_data/eqtl/fastqtl/*.allpairs.txt.gz") 
# In either case, to use the full data set, 
# the user will need to either download or symlink the raw GTEx v8 eQTL data 
# (found in the eqtl/fastqtl directory, from the full data download of GTEx v8 from dbGaP) to tempDir
baseDir = os.path.dirname(os.path.realpath(__file__)) + "/../"
filelist = glob.glob(baseDir + "data/temp/*.allpairs.txt.gz") 
outdir = baseDir + "data/"
scriptdir = baseDir + "util/"
tempdir = baseDir + "data/temp/"
outall = outdir + "all_chr.All_Tissues.sorted.txt.gz"
sqlite = outdir + "gene.chrom.pos.lookup.sqlite3.db"
gff3   = outdir + "ID.only.gff3.gz"
pickl  = scriptdir + "gene.symbol.pickle"
# User will need to download the following file from ensembl and save it to their data directory:
# ftp://ftp.ensembl.org/pub/release-97/gff3/homo_sapiens/Homo_sapiens.GRCh38.97.chr.gff3.gz
ensemb = outdir + "Homo_sapiens.GRCh38.97.chr.gff3.gz"
#############################################
#                                           #
#############################################

tissueList = list()
for infile in filelist:
    tissueList.append(infile.split("/")[-1].split(".")[0])

temp = subprocess.call(["mkdir","-p",tempdir])

with open("run.extract.Makefile","w") as w:
    outfileList = list()
    for i in list(range(1,23)) + ['X']:
        chrom = 'chr' + str(i)
        outfileList.append(outdir + chrom + ".All_Tissues.sorted.txt.gz")

    w.write(".DELETE_ON_ERROR:\n\nall:")
    for outfile in outfileList:
        w.write(" " + outfile + ".tbi")
    for tissue in tissueList:
        w.write(" " + outdir+tissue+".sorted.txt.gz.tbi")

    w.write(" " + outall + '.tbi ' + sqlite + " " + pickl + '\n\n')

    # Tabix the finalized sorted data files (tissue-specific and all-tissues)
    for outfile in outfileList:
        w.write(outfile + ".tbi: " + outfile + "\n\ttabix -c g -s 2 -b 3 -e 3 " + outfile + "\n\n")
    w.write(outall + ".tbi: " + outall + "\n\ttabix -c g -s 2 -b 3 -e 3 " + outall + "\n\n")

    # Create sorted all tissues data file (all chromosomes) from sorted chromosome-specific, all-tissues temporary data files
    w.write(outall+":")
    for i in list(range(1,23)) + ["X"]:
        infile = outdir+"chr"+str(i)+".All_Tissues.sorted.txt.gz"
        w.write(" " + infile)
    infile = outdir+"chr1.All_Tissues.sorted.txt.gz"
    w.write("\n\t(zcat " + infile)
    for i in list(range(2,23)) + ["X"]:
        infile = outdir+"chr"+str(i)+".All_Tissues.sorted.txt.gz"
        w.write(" ; zcat " + infile + " | tail -n +2")
    w.write(") | bgzip -c > " + outall + "\n\trm " + tempdir + "*.sorted.txt.gz*\n\n")

    # Create sorted chromosome-specific, all-tissues temporary data files from chromosome-specific, tissue-specific data files
    for i in list(range(1,23)) + ["X"]:
        outfile = outdir + "chr" + str(i) + ".All_Tissues.sorted.txt.gz"
        infileList = list()
        for tissue in tissueList:
            infile = tempdir + "chr" + str(i) + "." + tissue + ".sorted.txt.gz"
            infileList.append(infile)
        w.write(outfile + ":")
        for infile in infileList:
            w.write(" " + infile)
        w.write("\n\t(zcat " + infileList[0] + " | head -n 1 | awk -F, '{$$(NF+1)=" + '"tissue";}1' + "' OFS='\\t' - ; (")
        for tissue in tissueList:
            infile = tempdir + "chr" + str(i) + "." + tissue + ".sorted.txt.gz"
            w.write("zcat " + infile + " | tail -n +2 | awk -F, '{$$(NF+1)=" + '"' + tissue + '";}1' + "' OFS='\\t' -")
            if tissue != tissueList[-1]:
                w.write(" ; ")
        w.write(") | sort -T " + tempdir + " -k2,2V -k3,3n ) | bgzip -c > " + outfile + "\n\n")

    # Tabix single-tissue, all-chromsomes data files
    for tissue in tissueList:
        infile = outdir+tissue+".sorted.txt.gz"
        outfile = infile + ".tbi"
        w.write(outfile + ": " + infile + "\n\ttabix -c g -s 2 -b 3 -e 3 " + infile + "\n\n")

    # Create sorted data files (single tissue, all chromosomes) from sorted chromosome-specific, tissue-specific data files
    for tissue in tissueList:
        outfile = outdir+tissue+".sorted.txt.gz"
        infileList = list()
        for i in list(range(1,23)) + ['X']:
            infileList.append(tempdir + "chr" + str(i) + "." + tissue + ".sorted.txt.gz")
        w.write(outfile + ":")
        for infile in infileList:
            w.write(" " + infile)
        w.write("\n\t(zcat " + infileList[0])
        for infile in infileList[1:]:
            w.write("; zcat " + infile + " | tail -n +2")
        w.write(") | bgzip -c > " + outfile + "\n\n")
    
    # Create sorted chromosome-specific, tissue-specific data files from sorted all-chromosomes, tissue-specific data files
    for tissue in tissueList:
        for i in list(range(1,23)) + ['X']:
            outfile = tempdir + "chr" + str(i) + "." + tissue + ".sorted.txt.gz"
            infile = tempdir + tissue + ".allpairs.sorted.txt.gz"
            w.write(outfile + ": " + infile + ".tbi\n\ttabix -h " + infile + " chr" + str(i) + " | bgzip -c > " + outfile + "\n\n")

    for tissue in tissueList:
        infile = tempdir + tissue + ".allpairs.sorted.txt.gz"
        w.write(infile + ".tbi: " + infile + "\n\ttabix -c g -s 2 -b 3 -e 3 " + infile + "\n\n")
    
    for infile in filelist:
        outfile = tempdir + infile.split("/")[-1].replace(".txt.gz",".sorted.txt.gz")
        w.write(outfile + ": " + infile + "\n\t( zcat " + infile + " | head -n 1 | sed s/'variant_id'/'chr\\tpos\\tref\\talt\\tbuild'/ ; zcat " + infile + " | tail -n +2 | tr '_' '\\t' | sort -T " + tempdir + " -k2,2V -k3,3n ) | bgzip -c > " + outfile + "\n\n")

    # Create a pickled dictionary of gene names to gene symbols, to be used in translating gene names to symbols in read_eqtl.py
    w.write(pickl + ": " + gff3 + "\n\tpython " + scriptdir + "pickle.genes.py -i " + gff3 + "\n\n") 

    # Create sqlite3 database using bgzipped, tabixed, subsetted GFF3 file
    w.write(sqlite + ": " + gff3 + ".tbi\n\tpython " + scriptdir + "index.genes.into.sqlite3.py -i " + gff3 + " -o " + sqlite + "\n\n")

    # tabix subsetted file
    w.write(gff3 + ".tbi: " + gff3 + "\n\ttabix -s 1 -b 4 -e 5 " + gff3 + "\n\n")

    # Subset and sort ensembl GFF3 file
    w.write(gff3 + ": " + ensemb + "\n\tzgrep -v ^# " + ensemb + " | grep gene | grep -v exon | sort -T " + tempdir + " -k1,1V -k4,4n -k5,5n | bgzip -c > " + gff3 + "\n\n")
