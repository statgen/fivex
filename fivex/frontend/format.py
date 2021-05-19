import dataclasses as dc
import typing as ty

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


@dc.dataclass
class gencodeContainer:
    chrom: str
    source: str
    element: str
    start: int
    end: int
    strand: str
    gene_id: str
    datatype: str
    symbol: str

    def to_dict(self):
        return dc.asdict(self)


class gencodeParser:
    def __init__(self):
        pass

    def __call__(self, row: str) -> gencodeContainer:
        fields: ty.List[ty.Any] = row.split("\t")
        fields[0] = fields[0].replace("chr", "")
        fields[3] = int(fields[3])
        fields[4] = int(fields[4])
        fields[6] = fields[6].split(".")[0]
        return gencodeContainer(*fields)
