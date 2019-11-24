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

    @property
    def af_display(self) -> str:
        """
        A human-readable representation of allele frequency
        Use scientific notation for anything below 1e-4, else display as decimal
        # TODO: This sounds like a generic precision rule and should be moved to a template filter; our data classes
            should not be implementing UI decisions
        """
        return str(round(self.af, math.floor(-math.log10(float(self.af))) + 4))


def info_parser(row: str):
    fields = row.split("\t")
    return InfoContainer(*fields)


def get_variant_info(chrom: str, pos: int):
    """Get variant-specific information for annotations"""
    gene_lookup = model.get_gene_lookup()
    per_variant_path = model.get_best_per_variant_lookup()
    reader = readers.TabixReader(per_variant_path, parser=info_parser)
    reader.add_filter("position", pos)
    try:
        # It's possible that the user will request a variant for which no annotations are available,
        #  even if the variant is present in GTEx
        data = next(reader.fetch("chr" + chrom, pos - 1, pos + 1))
        ref = data.ref_allele
        alt = data.alt_allele
        top_gene = gene_lookup.get(data.top_gene.split(".")[0], "Unknown_Gene")
        top_tissue = data.top_tissue
        ac = data.ac
        af = data.af_display
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
