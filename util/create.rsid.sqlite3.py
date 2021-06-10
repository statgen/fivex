import glob
import gzip
import os.path
import sqlite3
import subprocess

# Generate shell script to make bgzipped files with chrom, pos, ref, alt, and rsnum

tsvList = glob.glob("../data/ebi_ge/*/*.tsv.gz")
temp = subprocess.call(["mkdir", "-p", "temp"])
outfileList = []

with open("./temp/get.rsid.tables.sh", "w") as w:
    for infile in tsvList:
        outfile = os.path.join(
            "./temp",
            os.path.basename(infile).replace(".tsv.gz", ".rsid.tsv.gz"),
        )
        outfileList.append(outfile)
        w.write(
            f"zcat {infile} | cut -f 4-7,21 | sort | uniq | bgzip -c > {outfile}\n"
        )


# Run script

temp = subprocess.call(["bash", "./temp/get.rsid.tables.sh"])


# create SQLite3 database of rsids

conn = sqlite3.connect("../data/rsid.sqlite3.db")


def parseline(line):
    (chrom, pos, ref, alt, rsid) = line.decode("utf-8").rstrip("\n").split()
    return [chrom, int(pos), ref, alt, rsid]


with conn:
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS rsidTable")
    cursor.execute(
        "CREATE TABLE rsidTable (chrom TEXT, pos INTEGER, ref TEXT, alt TEXT, rsid TEXT)"
    )

    for filename in outfileList:
        with gzip.open(filename.rstrip("\n")) as f:
            for line in f:
                try:
                    rsidList = parseline(line)
                    cursor.execute(
                        "INSERT INTO rsidTable VALUES (?,?,?,?,?)",
                        tuple(rsidList),
                    )
                except ValueError:
                    continue
    cursor.execute("CREATE INDEX idx_chrom_pos ON rsidTable (chrom, pos)")
    cursor.execute("CREATE INDEX idx_rsid ON rsidTable (rsid)")
    conn.commit()
    cursor.close()
