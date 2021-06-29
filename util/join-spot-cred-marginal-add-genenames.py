import argparse
import gzip
import json
import subprocess as sp
import sys

# Gene ID translation file. Example usage:
# geneIDMap['CFH'] = 'ENSG00000000971.15'
# geneIDMap['ENSG0000000097'] = 'CFH'
geneIDMapFile = (
    "/net/amd/amkwong/browseQTL/v2_data/data/gene.id.symbol.map.json.gz"
)
with gzip.open(geneIDMapFile, "rt") as f:
    geneIDMap = json.load(f)

parser = argparse.ArgumentParser(
    description="Join credible sets with marginal association"
)
parser.add_argument(
    "-a",
    "--all",
    type=str,
    required=True,
    help="File containing all cis associations (must be tabixed)",
)
parser.add_argument(
    "-c",
    "--cred",
    type=str,
    required=True,
    help="File containing credible set (must be tabixed)",
)
parser.add_argument(
    "-o",
    "--out",
    type=str,
    required=True,
    help="Output file name (to be bgzipped)",
)
parser.add_argument(
    "-r", "--region", type=str, required=True, help="Genomic region to query"
)
parser.add_argument(
    "--tabix",
    type=str,
    required=False,
    default="tabix",
    help="Path to binary tabix",
)
parser.add_argument(
    "--bgzip",
    type=str,
    required=False,
    default="bgzip",
    help="Path to binary bgzip",
)

args = parser.parse_args()

# cisf = "/net/amd/amkwong/browseQTL/v2_data/ebi_ge/1/all.EBI.ge.data.chr1.29000001-30000000.tsv.gz"
# credf = "/net/amd/amkwong/browseQTL/v2_data/credible_sets/ge/chr1.ge.credible_set.tsv.gz"
# outf = "/net/1000g/hmkang/data/spot/credible_sets/joined/ge/1/ge.credible_set.joinged.chr1.29000001-30000000.tsv.gz"
# chrom = "1"
# beg = 29000001
# end = 30000000
# tabix = "tabix"
# bgzip = "bgzip"

## Load credible set per each megabase bin
vid2trait2cred = {}  # type: ignore
creds = []
with sp.Popen(
    "{args.tabix} {args.cred} {args.region}".format(**locals()),
    shell=True,
    encoding="utf-8",
    stdout=sp.PIPE,
).stdout as fh:
    for line in fh:
        toks = line.rstrip().split("\t")
        (
            dataset,
            tissue,
            trait,
            vid,
            vchr,
            vpos,
            vref,
            valt,
            cs_id,
            cs_index,
            region,
            pip,
            z,
            cs_min_r2,
            cs_avg_r2,
            cs_size,
            posterior_mean,
            posterior_sd,
            cs_log10bf,
        ) = toks
        ## manual change needed here for BLUEPRINT to fix inconsistencies between credible set and all cis
        if (dataset == "BLUEPRINT_SE") or (dataset == "BLUEPRINT_PE"):
            dataset = "BLUEPRINT"
            toks[0] = "BLUEPRINT"
        ## manual change needed for van_de_Bunt_2015 to fix inconsistencies between credible set and all cis
        # if ( dataset == "van_de_Bunt_2015" ):
        #    dataset = "van_de_Bunt_2018"
        #    toks[0] = "van_de_Bunt_2018"
        ## manual change needed for esophagus_gej to fix inconsistencies between credible set and all cis
        # if ( ( dataset == "GTEx" ) and ( tissue.startswith("esophagus_gej") or tissue.startswith("esophagusj") ) ):
        #    tissue = "esophagus_gej"
        #    toks[1] = "esophagus_gej"
        creds.append(toks)
        traitID = ":".join([dataset, tissue, trait])
        if vid not in vid2trait2cred:
            vid2trait2cred[vid] = {}
        if traitID in vid2trait2cred[vid]:
            raise ValueError("Duplicate {vid} {traitID}".format(**locals()))
        # print("Register {vid} {traitID}".format(**locals()), file=sys.stderr)
        vid2trait2cred[vid][traitID] = len(creds) - 1

## Read all cis associations and identify the lines matching to the credible set
vid2trait2cis = {}  # type: ignore
with sp.Popen(
    "{args.tabix} {args.all} {args.region}".format(**locals()),
    shell=True,
    encoding="utf-8",
    stdout=sp.PIPE,
).stdout as fh:
    for line in fh:
        toks = line.rstrip().split("\t")
        (dataset, tissue, trait, vchr, vpos, vref, valt, vid) = toks[0:8]
        traitID = ":".join([dataset, tissue, trait])
        toks.append(geneIDMap.get(trait.split(".")[0], "Unknown_gene"))
        # FYI - order of toks : (dataset, tissue, trait, vchr, vpos, vref, valt, vid, ma_samples, maf, pvalue, beta, se, vtype, ac, an, r2, mol_trait_obj_id, gid, median_tpm, rsid)
        if (vid in vid2trait2cred) and (traitID in vid2trait2cred[vid]):
            if vid not in vid2trait2cis:
                vid2trait2cis[vid] = {}
            ## ignore the errors of seeing the sample SNP twice
            # if ( traitID in vid2trait2cis[vid] ):
            #    print(vid2trait2cis[vid],file=sys.stderr)
            #    print(toks,file=sys.stderr)
            #    raise ValueError("Duplicate cis {vid} {traitID}".format(**locals()))
            vid2trait2cis[vid][traitID] = toks

## write joined
with sp.Popen(
    "{args.bgzip} -c > {args.out}".format(**locals()),
    shell=True,
    encoding="utf-8",
    stdin=sp.PIPE,
).stdin as wh:
    for i in range(len(creds)):
        cred = creds[i]
        (dataset, tissue, trait, vid) = cred[0:4]
        traitID = ":".join([dataset, tissue, trait])
        if (vid not in vid2trait2cis) or (traitID not in vid2trait2cis[vid]):
            print(
                "WARNING: Could not find match for {vid} and {traitID}".format(
                    **locals()
                ),
                file=sys.stderr,
            )
            continue
        cis = vid2trait2cis[vid][traitID]
        if (
            (cred[0] != cis[0])
            or (cred[1] != cis[1])
            or (cred[2] != cis[2])
            or (cred[3] != cis[7])
        ):
            print(cred, file=sys.stderr)
            print(cis, file=sys.stderr)
            raise ValueError("ERROR: Incompatible lines")
        wh.write("\t".join(cred))
        wh.write("\t")
        wh.write("\t".join(cis[8:]))
        wh.write("\n")
