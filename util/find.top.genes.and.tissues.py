####
# For each variant, do the following:
#  1. Determine the most interesting gene
#  2. Determine the most interesting p-value
####

import argparse
import gzip

parser = argparse.ArgumentParser(
    description="Processes one chromosome file to find the best tissue and p-value for each variant"
)
parser.add_argument(
    "infile",
    metavar="INFILE",
    type=str,
    help="Input file containing information on all tissues, typically named chr#.All_Tissues.sorted.txt.gz",
)
parser.add_argument(
    "outfile",
    metavar="OUTFILE",
    type=str,
    help="Output file containing a top gene and tissue for each variant",
)
args = parser.parse_args()

with gzip.open(args.infile) as f, open(args.outfile, "w") as w:
    header = f.readline()
    # w.write('chrom\tpos\tref\talt\ttopGene\ttopTissue\n')
    currentPos = 0
    for line in f:
        if currentPos == 0:
            (
                bestGene,
                chrom,
                postxt,
                ref,
                alt,
                build,
                tss_distance,
                ma_samples,
                ma_count,
                maf,
                pval_nominal,
                slope,
                slope_se,
                bestTissue,
            ) = (line.decode("utf-8").rstrip("\n").split("\t"))
            currentPos = int(postxt)
            currentRef = ref
            currentAlt = alt
            pval = float(pval_nominal)
        else:
            (
                gene_id,
                chrom,
                postxt,
                ref,
                alt,
                build,
                tss_distance,
                ma_samples,
                ma_count,
                maf,
                pval_nominal,
                slope,
                slope_se,
                tissue,
            ) = (line.decode("utf-8").rstrip("\n").split("\t"))
            pos = int(postxt)
            if currentPos == pos and currentRef == ref and currentAlt == alt:
                if float(pval_nominal) < pval:
                    bestGene = gene_id
                    bestTissue = tissue
                    pval = float(pval_nominal)
            else:
                w.write(
                    f"{chrom}\t{currentPos}\t{currentRef}\t{currentAlt}\t{bestGene}\t{bestTissue}\n"
                )
                bestGene = gene_id
                bestTissue = tissue
                currentPos = int(postxt)
                currentRef = ref
                currentAlt = alt
                pval = float(pval_nominal)
    w.write(
        f"{chrom}\t{currentPos}\t{currentRef}\t{currentAlt}\t{bestGene}\t{bestTissue}\n"
    )
