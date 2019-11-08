try:
    # Optional speedup features
    from fastnumbers import int
except ImportError:
    pass

from zorp import parser_utils, readers

import pheget
import os

class InfoContainer:
    def __init__(self, chromosome, position, refAllele, altAllele, 
                  top_gene, top_tissue, ac, af, an):
        self.chromsome = chromosome
        self.position = position
        self.refAllele = refAllele
        self.altAllele = altAllele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = ac
        self.af = af
        self.an = an

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


def get_variant_info(chrom: str, pos: int):
    infoDB = os.path.join(pheget.app.config['DATA_DIR'], 'GTEx_v8.best.genes.tissues.allele.info.txt.gz')
    reader = readers.TabixReader(infoDB, parser=info_parser)
    return reader.fetch('chr' + chrom, pos - 1, pos + 1)
