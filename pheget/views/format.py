try:
    # Optional speedup features
    from fastnumbers import int
except ImportError:
    pass

from zorp import parser_utils, readers

import pheget
import os
import pickle
import math

class InfoContainer:
    def __init__(self, chromosome, position, refAllele, altAllele, 
                  top_gene, top_tissue, ac, af, an, rsid):
        self.chromsome = chromosome
        self.position = position
        self.refAllele = refAllele
        self.altAllele = altAllele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = ac
        self.af = af
        self.an = an
        self.rsid = rsid

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

def afFormat(afText):
    return(str(round(float(afText), math.floor(-math.log10(float(afText)))+4)))

def get_variant_info(chrom: str, pos: int):
    with open(os.path.join(pheget.app.config['DATA_DIR'], 'gene.symbol.pickle'), 'rb') as f:
        SYMBOL_DICT = pickle.load(f)
    infoDB = os.path.join(pheget.app.config['DATA_DIR'], 'best.genes.tissues.allele.info.rsnum.txt.gz')
    reader = readers.TabixReader(infoDB, parser=info_parser)
    data = [res.to_dict() for res in reader.fetch('chr' + chrom, pos - 1, pos + 1)][0]
    ref = data['refAllele']
    alt = data['altAllele']
    top_gene = SYMBOL_DICT.get(data['top_gene'].split(".")[0], 'Unknown_Gene')
    top_tissue = data['top_tissue']
    ac = data['ac']
    af = afFormat(data['af'])
    an = data['an']
    rsid = data['rsid']
    return ([ref, alt, top_gene, top_tissue, ac, af, an, rsid])
