import dataclasses as dc
import typing as ty

try:
    # Optional speedup features
    from fastnumbers import int  # type: ignore
except ImportError:
    pass


# Container for parsing gencode files (tabix-indexed)
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


@dc.dataclass
class gencodeTranscriptContainer:
    chrom: str
    source: str
    element: str
    start: int
    end: int
    strand: str
    gene_id: str
    transcript_id: str
    datatype: str
    symbol: str
    transcript_type: str
    transcript_symbol: str

    def to_dict(self):
        return dc.asdict(self)


# Parser for tabix-indexed gencode file
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


# Parser for tabix-indexed gencode transcripts file
class gencodeTranscriptParser:
    def __init__(self):
        pass

    def __call__(self, row: str) -> gencodeTranscriptContainer:
        fields: ty.List[ty.Any] = row.split("\t")
        fields[0] = fields[0].replace("chr", "")
        fields[3] = int(fields[3])
        fields[4] = int(fields[4])
        fields[6] = fields[6].split(".")[0]
        fields[7] = fields[7].split(".")[0]
        return gencodeTranscriptContainer(*fields)
