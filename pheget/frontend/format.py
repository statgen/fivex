import math

from zorp import readers  # type: ignore

from pheget import model

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


def allele_freq_display(af):
    """Format allele frequency. Use scientific notation for anything below 1e-4, else display as decimal"""
    return str(round(af, math.floor(-math.log10(float(af))) + 4))


def get_variant_info(chrom: str, pos: int):
    gene_lookup = model.get_gene_lookup()
    per_variant_path = model.get_best_per_variant_lookup()
    reader = readers.TabixReader(per_variant_path, parser=info_parser)
    reader.add_filter("position", pos)
    try:
        data = next(reader.fetch("chr" + chrom, pos - 1, pos + 1))
        ref = data.ref_allele
        alt = data.alt_allele
        top_gene = gene_lookup.get(data.top_gene.split(".")[0], "Unknown_Gene")
        top_tissue = data.top_tissue
        ac = data.ac
        af = allele_freq_display(data.af)
        an = data.an
        rsid = data.rsid
    except (StopIteration, ValueError):
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
