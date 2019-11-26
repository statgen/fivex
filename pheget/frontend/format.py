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
        chromosome=None,
        position=None,
        ref_allele=None,
        alt_allele=None,
        top_gene=None,
        top_tissue=None,
        ac=None,
        af=None,
        an=None,
        rsid=None,
    ):
        self.chromsome = chromosome
        self.position = int(position) if position is not None else None
        self.ref_allele = ref_allele
        self.alt_allele = alt_allele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = int(ac) if ac is not None else None
        self.af = float(af) if af is not None else None
        self.an = int(an) if an is not None else None
        self.rsid = rsid


def info_parser(row: str) -> InfoContainer:
    fields = row.split("\t")
    return InfoContainer(*fields)


def get_variant_info(chrom: str, pos: int):
    """Get variant-specific information for annotations"""
    gene_lookup = model.get_gene_lookup()
    per_variant_path = model.get_best_per_variant_lookup()
    reader = (
        readers.TabixReader(per_variant_path, parser=info_parser)
        .add_filter("position", pos)
        .add_transform(
            "top_gene",
            lambda item: gene_lookup.get(
                item.top_gene.split(".")[0], "Unknown_Gene"
            ),
        )
        .add_transform(
            "af",
            lambda item: str(
                round(item.af, math.floor(-math.log10(float(item.af))) + 4)
            ),
        )
    )

    try:
        # It's possible that the user will request a variant for which no annotations are available,
        #  even if the variant is present in GTEx
        data = next(reader.fetch("chr" + chrom, pos - 1, pos + 1))
    except StopIteration:
        data = InfoContainer()

    return data
