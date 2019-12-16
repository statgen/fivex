import argparse
import gzip
import shelve
import subprocess
import sys


# This file contains chrom, pos, ref, alt, ac, af, an
def gtexGen(fileObj):
    while True:
        line = fileObj.readline().decode("utf-8")
        if not line:
            break
        temp = line.rstrip("\n").split("\t")
        yield (
            (
                temp[0],
                int(temp[1]),
                temp[2],
                temp[3],
                temp[4],
                float(temp[5]),
                temp[6],
            )
        )


# This file contains chrom, pos, ref, alt, bestGene, bestTissue
def bestGen(fileObj):
    while True:
        line = fileObj.readline()
        if not line:
            break
        temp = line.rstrip("\n").split("\t")
        yield ((temp[0], int(temp[1]), temp[2], temp[3], temp[4], temp[5]))


def rangeGen():
    chrList = [str(i) for i in range(1, 23)] + ["X"]
    idx = 0
    while True:
        yield (f"chr{chrList[idx]}")
        idx += 1


def main():
    parser = argparse.ArgumentParser(
        description="Combine files with AC/AF/AN with best tissue/gene and rs numbers"
    )
    parser.add_argument(
        "infile",
        metavar="INFILE",
        type=str,
        help="Input file with with AC/AF/AN",
    )
    parser.add_argument(
        "prefix",
        metavar="PREFIX",
        type=str,
        help="Input file prefix with best tissues and genes(before chr#)",
    )
    parser.add_argument(
        "suffix",
        metavar="SUFFIX",
        type=str,
        help="Input file suffix with best tissues and genes (after chr#)",
    )
    parser.add_argument(
        "outfile",
        metavar="OUTFILE",
        type=str,
        help="Output file name - default = best.genes.tissues.allele.info.rsnum.txt.gz",
    )
    parser.add_argument(
        "shelve",
        metavar="SHELVE",
        type=str,
        help="Python shelve object mapping chr:pos:ref:alt to rsid",
    )

    args = parser.parse_args()

    # f will iterate through a file containing all AC/AF/AN (about 46 million variants) in one file
    # s contains all rs numbers retrieved from the lookup table file, found on GTExPortal
    with gzip.open(args.infile) as f, open(
        args.outfile, "w"
    ) as w, shelve.open(args.shelve) as s:
        bgzip = subprocess.Popen(
            ["bgzip", "-c"], stdin=subprocess.PIPE, stdout=w
        )
        genoGen = gtexGen(f)  # ACAFAN
        (chrom, pos, ref, alt, ac, af, an) = next(genoGen)  # Initialize values
        chrRangeGen = rangeGen()  # Initialize the chromosome generator
        currentChr = next(chrRangeGen)
        bestInfile = f"{args.prefix}{currentChr}{args.suffix}"  # This contains best gene/tissue information
        g = open(bestInfile)
        bestInfoGen = bestGen(g)
        (gchr, gpos, gref, galt, gene, tissue) = next(
            bestInfoGen
        )  # Initialize values
        while True:
            # If all fields match, find the rsid and write to the output: chrom pos ref alt gene tissue AC AF AN rsid
            # Then advance both generators and continue
            if gchr == chrom and gpos == pos and gref == ref and galt == alt:
                rsid = s.get(":".join([chrom, str(pos), ref, alt]), "Unknown")
                bgzip.stdin.write(
                    f"{chrom}\t{pos}\t{ref}\t{alt}\t{gene}\t{tissue}\t{ac}\t{af}\t{an}\t{rsid}\n".encode(
                        "utf-8"
                    )
                )
                try:
                    (chrom, pos, ref, alt, ac, af, an) = next(
                        genoGen
                    )  # One file, will not run out
                except StopIteration:
                    break
                try:
                    (gchr, gpos, gref, galt, gene, tissue) = next(
                        bestInfoGen
                    )  # Multiple files, will run out
                except StopIteration:
                    g.close()
                    try:
                        currentChr = next(chrRangeGen)
                        bestInfile = f"{args.prefix}{currentChr}{args.suffix}"
                        g = gzip.open(bestInfile)
                        bestInfoGen = bestGen(g)
                        (gchr, gpos, gref, galt, gene, tissue) = next(
                            bestInfoGen
                        )
                        continue
                    except IndexError:
                        break
            # If they are different chromosomes, close the current 'top' file and open the next one if possible, break otherwise
            # If chromosome is the same but allele info is ahead of the genotype generator, advance the genotype generator
            if gchr == chrom and gpos > pos:
                try:
                    (chrom, pos, ref, alt, ac, af, an) = next(genoGen)
                    continue
                except StopIteration:
                    break
            # If the genotype generator skipped the current variant, then something seriously went wrong and we need to stop
            if gchr == chrom and gpos < pos:
                sys.exit(2)
            # if chromosomes are different, advance the best AC/AF/AN file
            if gchr != chrom:
                try:
                    (chrom, pos, ref, alt, ac, af, an) = next(genoGen)
                    continue
                except StopIteration:
                    break
        bgzip.communicate()


if __name__ == "__main__":
    main()
