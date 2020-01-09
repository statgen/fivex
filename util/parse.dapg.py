import gzip
import sqlite3

dapgDB = "../data/GTEx_v8_finemapping_DAPG.sqlite.db"
conn = sqlite3.connect(dapgDB)


def row_gen():
    with gzip.open("../data/GTEx_v8_finemapping_DAPG.txt.gz", "rb") as f:
        _ = f.readline()
        for line in f:
            (tissue, gene, cluster, spip, var_id, var_pip) = (
                line.decode("utf-8").rstrip("\n").split()
            )
            (chrom, pos, ref, alt, build) = var_id.split("_")
            yield (
                chrom,
                int(pos),
                ref,
                alt,
                tissue,
                gene,
                int(cluster),
                float(spip),
                float(var_pip),
            )


with conn:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS dapg(chrom TEXT, pos INT, ref TEXT, alt TEXT, tissue TEXT, gene TEXT, cluster INT, spip REAL, pip REAL)"
    )
    conn.executemany(
        "INSERT OR REPLACE INTO dapg VALUES (?,?,?,?,?,?,?,?,?)", row_gen()
    )
    conn.execute("CREATE INDEX idx_dapg_chrom_pos ON dapg (chrom, pos)")
    conn.execute("CREATE INDEX idx_dapg_tissue ON dapg (tissue)")
