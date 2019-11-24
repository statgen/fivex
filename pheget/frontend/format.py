import math
import os
import pickle

from zorp import readers  # type: ignore

try:
    # Optional speedup features
    from fastnumbers import int  # type: ignore
except ImportError:
    pass


class InfoContainer:
    def __init__(
        self,
        chromosome,
        position,
        ref_allele,
        alt_allele,
        top_gene,
        top_tissue,
        ac,
        af,
        an,
        rsid,
    ):
        self.chromsome = chromosome
        self.position = int(position)
        self.ref_allele = ref_allele
        self.alt_allele = alt_allele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = int(ac)
        self.af = float(af)
        self.an = int(an)
        self.rsid = rsid


def info_parser(row: str):
    fields = row.split("\t")
    return InfoContainer(*fields)


def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info
    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split("_")
    return chrom, int(pos)


def afFormat(af):
    """Format allele frequency. Use scientific notation for anything below 1e-4, else display as decimal"""
    return str(round(af, math.floor(-math.log10(float(af))) + 4))


def get_variant_info(chrom: str, pos: int):
    from flask import (
        current_app,
    )  # avoid application context error on app init FIXME: find better workaround

    with open(
        os.path.join(
            current_app.config["PHEGET_DATA_DIR"], "gene.symbol.pickle"
        ),
        "rb",
    ) as f:
        SYMBOL_DICT = pickle.load(f)
    infoDB = os.path.join(
        current_app.config["PHEGET_DATA_DIR"],
        "best.genes.tissues.allele.info.rsnum.txt.gz",
    )
    reader = readers.TabixReader(infoDB, parser=info_parser)
    reader.add_filter("position", pos)
    try:
        data = next(reader.fetch("chr" + chrom, pos - 1, pos + 1))
        ref = data.ref_allele
        alt = data.alt_allele
        top_gene = SYMBOL_DICT.get(data.top_gene.split(".")[0], "Unknown_Gene")
        top_tissue = data.top_tissue
        ac = data.ac
        af = afFormat(data.af)
        an = data.an
        rsid = data.rsid
    except (StopIteration, OSError, ValueError):
        (ref, alt, top_gene, top_tissue, ac, af, an, rsid) = (
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )

    return [ref, alt, top_gene, top_tissue, ac, af, an, rsid]
