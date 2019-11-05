try:
    # Optional speedup features
    from fastnumbers import int, float
except ImportError:
    pass

from zorp import parser_utils, readers

import pheget

class InfoContainer:
    def __init__(self, chromosome, position, refAllele, altAllele, 
                 ac, af, an, rsid, top_gene, top_tissue):
        self.chromsome = chromosome
        self.position = position
        self.refAllele = refAllele
        self.altAllele = altAllele

        self.ac = ac
        self.af = af
        self.an = an

        self.rsid = rsid
        self.top_gene = top_gene
        self.top_tissue = top_tissue

    def to_dict(self):
        return vars(self)


def info_parser(row: str):
    fields = row.split('\t')
    return InfoContainer(*fields)


def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info
    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split('_')
    return chrom, int(pos)


def get_variant_info(chrom: str, pos:str) -> ty.Iteratable[InfoContainer]:
    infoDB = pheget.app.config['DATA_DIR'] + '/GTEx_v8.infoDB.txt.gz'
    reader = readers.TabixReader(source, parser=info_parser, skip_rows=1)
    return reader.fetch(chrom, pos, pos + 1)
