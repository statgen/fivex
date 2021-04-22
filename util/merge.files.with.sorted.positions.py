import sys
import subprocess as sp


def parse_a_line(s):
    if (len(s) == 0) or (s == "\n"):
        return ["DUMMY_VAR"] * posIdx + [1000000000]
    else:
        return s.rstrip().split("\t")


## assumption : Input file looks like this:
## [dataset_name] [tissue_name] [filename]

indexf = sys.argv[1]
chrom = sys.argv[2]
beg = sys.argv[3]
end = sys.argv[4]
outf = sys.argv[5]
posIdx = sys.argv[6]  # 2 for EBI expression data, 3 for credible_set data


# If no posIdx provided, default to 2 for EBI expression data file format
if posIdx == None:
    posIdx = 2
else:
    posIdx = int(posIdx)


## read index file
index_list = []
with open(indexf, "rt", encoding="utf-8") as fh:
    for line in fh:
        (dataset, tissue, filename) = line.rstrip().split()
        index_list.append([dataset, tissue, filename])


## open all files, and read the first line
fhs = []
lines = []
poss = []
MAXPOS = 1000000000
minpos = MAXPOS
for i in range(len(index_list)):
    (dataset, tissue, filename) = index_list[i]
    ## you can change this part by using pysam
    fh = sp.Popen(
        "tabix {filename} {chrom}:{beg}-{end}".format(**locals()),
        shell=True,
        encoding="utf-8",
        stdout=sp.PIPE,
    ).stdout
    fhs.append(fh)
    toks = parse_a_line(fh.readline())
    lines.append(toks)
    bp = int(toks[posIdx])
    if bp < minpos:
        minpos = bp
    poss.append(bp)

## now process each position at a time
with sp.Popen(
    "bgzip -c > {outf}".format(**locals()),
    shell=True,
    encoding="utf-8",
    stdin=sp.PIPE,
).stdin as wh:
    while minpos < MAXPOS:
        new_minpos = MAXPOS
        for i in range(len(index_list)):
            while poss[i] == minpos:  ## then I need to print this
                ## print the stored line
                wh.write("%s\t%s\t" % (index_list[i][0], index_list[i][1]))
                wh.write("\t".join(lines[i]))
                wh.write("\n")
                ## parse the next line
                toks = parse_a_line(fhs[i].readline())
                ## update lines and poss
                poss[i] = int(toks[posIdx])
                lines[i] = toks
            if poss[i] < new_minpos:
                new_minpos = poss[i]
        minpos = new_minpos
