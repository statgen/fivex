import math
import typing as ty

from zorp import readers  # type: ignore

from fivex import model

try:
    # Optional speedup features
    from fastnumbers import int  # type: ignore
except ImportError:
    pass


class InfoContainer:
    def __init__(
        self,
        chromosome: str = None,
        position: int = None,
        ref_allele: str = None,
        alt_allele: str = None,
        top_gene: str = None,
        top_tissue: str = None,
        ac: int = None,
        af: float = None,
        an: int = None,
        rsid: str = None,
    ):
        self.chromsome = chromosome
        self.position = position
        self.ref_allele = ref_allele
        self.alt_allele = alt_allele

        self.top_gene = top_gene
        self.top_tissue = top_tissue

        self.ac = ac
        self.af = af
        self.an = an
        self.rsid = rsid


def info_parser(row: str) -> InfoContainer:
    fields: ty.List[ty.Any] = row.split("\t")
    fields[1] = int(fields[1])  # pos
    fields[6] = int(fields[6])  # ac
    fields[7] = float(fields[7])  # af
    fields[8] = int(fields[8])  # an
    return InfoContainer(*fields)


def get_variant_info(chrom: str, pos: int):
    """Get variant-specific information for annotations"""
    gene_lookup = model.get_gene_names_conversion()
    per_variant_path = model.get_best_per_variant_lookup()
    reader = (
        readers.TabixReader(per_variant_path, parser=info_parser)
        .add_filter("position", pos)
        .add_lookup(
            "top_gene",
            lambda item: gene_lookup.get(
                item.top_gene.split(".")[0], "Unknown_Gene"
            ),
        )
        .add_lookup(
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
    except (ValueError, StopIteration):
        data = InfoContainer()

    return data
