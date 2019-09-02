"""Helper functions"""

def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info

    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split('_')
    return chrom, int(pos)

def gene2symbol(gene_id: str):
    import sqlite3
    geneDB = "./gene.chrom.pos.lookup.sqlite3.db"
    conn = sqlite3.connect(geneDB)
    c = conn.cursor()
    genetxt = args.gene
    if '.' in genetxt:
        genetxt = genetxt.split(".")[0]
    c.execute("SELECT * FROM genelookup WHERE gene_id=?", (genetxt,) )
    dataReturn = c.fetchone()
    conn.close()
    if dataReturn == None:
        gene_id = symbol = chrom = start = end = datatype = None
    else:
        return(gene_id, symbol, chrom, int(start), int(end), datatype)

# Converts a Gene Symbol (e.g. "CFH") to Gene ID ("ENSG00000000971"), along with chromosome, start, end, and data type (gene or transcript)
def symbol2gene(symbol: str):
    import sqlite3
    geneDB = "./gene.chrom.pos.lookup.sqlite3.db"
    conn = sqlite3.connect(geneDB)
    c = conn.cursor()
    c.execute("SELECT * FROM genelookup WHERE symbol=?", (args.symbol,) )
    dataReturn = c.fetchone()
    conn.close()
    if dataReturn == None:
        gene_id = symbol = chrom = start = end = datatype = None
    else:
        return(gene_id, symbol, chrom, int(start), int(end), datatype)

