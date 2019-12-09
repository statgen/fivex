import glob
import os
import subprocess

#############################################
# Specify input and output directories here #
#############################################
# If you are working from within the UM StatGen cluster, and you wish to fully process the data from the raw source,
# you can use the following path to the full data set from GTEx v8
# filelist = glob.glob("/net/dumbo/home/xwen/ncbi/dbGaP-9060/gtex_v8_data/eqtl/fastqtl/*.allpairs.txt.gz")
# In either case, to use the full data set,
# the user will need to either download or symlink the raw GTEx v8 eQTL data
# (found in the eqtl/fastqtl directory, from the full data download of GTEx v8 from dbGaP) to tempDir
baseDir = "/".join(os.path.dirname(os.path.realpath(__file__)).split("/")[:-1])
filelist = glob.glob(baseDir + "/data/temp/*.allpairs.txt.gz")
outdir = os.path.join(baseDir, "data")
scriptdir = os.path.join(baseDir, "util")
lookupscript = os.path.join(scriptdir, "create.gene.id.lookup.py")
tempdir = os.path.join(baseDir, "data/temp")
outall = os.path.join(outdir, "all_chr.All_Tissues.sorted.txt.gz")
sqlite = os.path.join(outdir, "gene.chrom.pos.lookup.sqlite3.db")
gff3 = os.path.join(outdir, "ID.only.gff3.gz")
genejson = os.path.join(outdir, "gene.id.symbol.map.json.gz")
siglines = os.path.join(outdir, "all.chr.sig.vars.txt")
siglookup = os.path.join(outdir, "sig.lookup.db")
sigscript = os.path.join(scriptdir, "generate.sqlite3.db.for.sig.py")
# User will need to download a gene file from ensembl and save it to their data directory:
# As of the writing of this program, the latest version is Release 97, found at the following
# ftp://ftp.ensembl.org/pub/release-97/gff3/homo_sapiens/Homo_sapiens.GRCh38.97.chr.gff3.gz
# Edit the file name on the following line if using a newer version
ensemb = os.path.join(outdir, "Homo_sapiens.GRCh38.97.chr.gff3.gz")

#############################################
#                                           #
#############################################

tissueList = list()
for infile in filelist:
    tissueList.append(infile.split("/")[-1].split(".")[0])

temp = subprocess.call(["mkdir", "-p", tempdir])

with open("run.extract.Makefile", "w") as w:
    outfileList = list()
    for i in list(range(1, 23)) + ["X"]:  # type: ignore
        chrom = "chr" + str(i)
        outfileList.append(
            os.path.join(outdir, f"{chrom}.All_Tissues.sorted.txt.gz")
        )

    w.write(f".DELETE_ON_ERROR:\n\nall: {siglookup}")
    for outfile in outfileList:
        w.write(f" {outfile}.tbi")
    for tissue in tissueList:
        w.write(" " + os.path.join(outdir, f"{tissue}.sorted.txt.gz.tbi"))
    w.write(f" {outall}.tbi\n.PHONY: all clean cleanup\n\n")

    # Tabix the finalized sorted data files (tissue-specific and all-tissues)
    for outfile in outfileList:
        w.write(
            f"{outfile}.tbi: {outfile}\n\ttabix -c g -s 2 -b 3 -e 3 {outfile}\n\n"
        )
    w.write(
        f"{outall}.tbi: {outall}\n\ttabix -c g -s 2 -b 3 -e 3 {outall}\n\n"
    )

    # Generate an sqlite3 database with only significant (p<1e-5) variants for fast lookup and suggestions
    w.write(
        f"{siglookup}: {siglines}\n\tpython {sigscript} {siglines} {siglookup}\n\n"
    )
    w.write(f"{siglines}:")
    for i in list(range(1, 23)) + ["X"]:  # type: ignore
        w.write(f" chr{i}.All_Tissues.sorted.txt.gz")
    w.write("\n")
    for i in list(range(1, 23)) + ["X"]:  # type: ignore
        w.write(
            f"zcat chr{i}.All_Tissues.sorted.txt.gz | tail -n +2 | perl -nale 'print if $F[10] < 1e-5' | cut -f 1-5,11,14 >> {siglines}\n"
        )
    w.write("\n")

    # Create sorted all tissues data file (all chromosomes) from sorted chromosome-specific, all-tissues tmp data files
    w.write(outall + ":")
    for i in list(range(1, 23)) + ["X"]:  # type: ignore
        infile = os.path.join(outdir, f"chr{i}.All_Tissues.sorted.txt.gz")
        w.write(" " + infile)
    infile = os.path.join(outdir, "chr1.All_Tissues.sorted.txt.gz")
    w.write("\n\t(zcat " + infile)
    for i in list(range(2, 23)) + ["X"]:  # type: ignore
        infile = os.path.join(outdir, f"chr{i}.All_Tissues.sorted.txt.gz")
        w.write(" ; zcat " + infile + " | tail -n +2")
    w.write(") | bgzip -c > " + outall + "\n\n")

    # Create sorted chromosome-specific, all-tissues tmp files from chromosome-specific, tissue-specific data files
    for i in list(range(1, 23)) + ["X"]:  # type: ignore
        outfile = os.path.join(outdir, f"chr{i}.All_Tissues.sorted.txt.gz")
        infileList = list()
        for tissue in tissueList:
            infile = os.path.join(tempdir, f"chr{i}.{tissue}.sorted.txt.gz")
            infileList.append(infile)
        w.write(outfile + ":")
        for infile in infileList:
            w.write(" " + infile)
        w.write(
            "\n\t(zcat "
            + infileList[0]
            + " | head -n 1 | awk -F, '{$$(NF+1)="
            + '"tissue";}1'
            + "' OFS='\\t' - ; ("
        )
        for tissue in tissueList:
            infile = os.path.join(tempdir, f"chr{i}.{tissue}.sorted.txt.gz")
            w.write(
                "zcat "
                + infile
                + " | tail -n +2 | awk -F, '{$$(NF+1)="
                + '"'
                + tissue
                + '";}1'
                + "' OFS='\\t' -"
            )
            if tissue != tissueList[-1]:
                w.write(" ; ")
        w.write(
            ") | sort -T "
            + tempdir
            + " -k2,2V -k3,3n ) | bgzip -c > "
            + outfile
            + "\n\n"
        )

    # Tabix single-tissue, all-chromsomes data files
    for tissue in tissueList:
        infile = os.path.join(outdir, f"{tissue}.sorted.txt.gz")
        outfile = f"{infile}.tbi"
        w.write(
            outfile
            + ": "
            + infile
            + "\n\ttabix -c g -s 2 -b 3 -e 3 "
            + infile
            + "\n\n"
        )

    # Create sorted data files (single tissue, all chromosomes) from sorted chromosome-specific,
    #   tissue-specific data files
    for tissue in tissueList:
        outfile = os.path.join(outdir, f"{tissue}.sorted.txt.gz")
        infileList = list()
        for i in list(range(1, 23)) + ["X"]:  # type: ignore
            infileList.append(
                os.path.join(tempdir, f"chr{i}.{tissue}.sorted.txt.gz")
            )
        w.write(outfile + ":")
        for infile in infileList:
            w.write(" " + infile)
        w.write("\n\t(zcat " + infileList[0])
        for infile in infileList[1:]:
            w.write("; zcat " + infile + " | tail -n +2")
        w.write(") | bgzip -c > " + outfile + "\n\n")

    # Create sorted chromosome-specific, tissue-specific data files from sorted all-chromosomes,
    #   tissue-specific data files
    for tissue in tissueList:
        for i in list(range(1, 23)) + ["X"]:  # type: ignore
            outfile = os.path.join(tempdir, f"chr{i}.{tissue}.sorted.txt.gz")
            infile = os.path.join(tempdir, f"{tissue}.allpairs.sorted.txt.gz")
            w.write(
                f"{outfile}: {infile}.tbi\n\ttabix -h {infile} chr{i} | bgzip -c > {outfile}\n\n"
            )

    for tissue in tissueList:
        infile = os.path.join(tempdir, f"{tissue}.allpairs.sorted.txt.gz")
        w.write(
            f"{infile}.tbi: {infile}\n\ttabix -c g -s 2 -b 3 -e 3 {infile}\n\n"
        )

    for infile in filelist:
        outfile = os.path.join(
            tempdir,
            os.path.basename(infile).replace(".txt.gz", ".sorted.txt.gz"),
        )
        w.write(
            f"{outfile}: {infile}\n\t( zcat {infile} | head -n 1 | sed s/'variant_id'/'chr\\tpos\\tref\\alt\\build'/ ; zcat {infile} | head -n +2 | tr '_' '\\t' | sort -T {tempdir}  -k2,2V -k3,3n ) | bgzip -c > {outfile}\n\n"
        )  # noqa

    # Create a json file containing the two-way lookup table between gene names and gene IDs
    w.write(
        f"{genejson}: {gff3}\n\tpython {lookupscript} --infile {gff3} --outfile {genejson}\n\n"
    )

    # tabix subsetted file
    w.write(f"{gff3}.tbi: {gff3}\n\ttabix -s 1 -b 4 -e 5 {gff3}\n\n")

    # Subset and sort ensembl GFF3 file
    w.write(
        f"{gff3}: {ensemb}\n\tzgrep -v ^# {ensemb} | grep 'ID=gene' | sort -T {tempdir} -k1,1V -k4,4n -k5,5n | bgzip -c > {gff3}\n\n"
    )  # noqa

    # Cleanup
    w.write(f"cleanup:\n\trm {tempdir}/*.sorted.txt.gz*\n\n")

    # Clean
    w.write(
        "clean:\n\trm "
        + os.path.join(outdir, "*.sorted.txt.gz*")
        + f" {sqlite} {siglookup} {genejson}\n"
    )  # noqa
