import math
import os
import pickle

try:
    # Optional speedup features
    from fastnumbers import int
except ImportError:
    pass

from zorp import readers

import pheget


class InfoContainer:
    def __init__(self, chromosome, position, refAllele, altAllele,
                 top_gene, top_tissue, ac, af, an, rsid):
        self.chromsome = chromosome
        self.position = int(position)
        self.refAllele = refAllele
        self.altAllele = altAllele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = int(ac)
        self.af = float(af)
        self.an = int(an)
        self.rsid = rsid


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


def afFormat(af):
    """Format allele frequency. Use scientific notation for anything below 1e-4, else display as decimal"""
    return str(round(af, math.floor(-math.log10(float(af))) + 4))


def get_variant_info(chrom: str, pos: int):
    with open(os.path.join(pheget.app.config['DATA_DIR'], 'gene.symbol.pickle'), 'rb') as f:
        SYMBOL_DICT = pickle.load(f)
    infoDB = os.path.join(pheget.app.config['DATA_DIR'], 'best.genes.tissues.allele.info.rsnum.txt.gz')
    reader = readers.TabixReader(infoDB, parser=info_parser)
    reader.add_filter('position', pos)
    try:
        data = next(reader.fetch('chr' + chrom, pos - 1, pos + 1))
        ref = data.refAllele
        alt = data.altAllele
        top_gene = SYMBOL_DICT.get(data.top_gene.split('.')[0], 'Unknown_Gene')
        top_tissue = data.top_tissue
        ac = data.ac
        af = afFormat(data.af)
        an = data.an
        rsid = data.rsid
    except (StopIteration, OSError):
        (ref, alt, top_gene, top_tissue, ac, af, an, rsid) = (
            None, None, None, None, None, None, None, None
        )

    return [ref, alt, top_gene, top_tissue, ac, af, an, rsid]
