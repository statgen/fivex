import typing as ty

from zorp import readers


class VariantContainer:
    """
    Represent the variant data in a standard manner that lets us access fields by name

    This allows us to make changes to how the data is stored, but all our code can still access the fields it wants
    without being changed
    """
    def __init__(self, chrom, pos, gene_id, ref, alt, build,
                 tss_distance,
                 ma_samples, ma_count, maf,
                 pval_nominal, slope, slope_se,
                 tissue):
        self.chrom = chrom
        self.pos = pos
        self.ref = ref
        self.alt = alt
        self.gene_id = gene_id

        self.build = build

        self.tss_distance = tss_distance
        self.ma_samples = ma_samples
        self.ma_count = ma_count
        self.maf = maf

        self.pvalue = pval_nominal
        self.slope = slope
        self.slope_se = slope_se

        self.tissue = tissue

    def to_dict(self):
        return vars(self)


def variant_parser(row: str) -> VariantContainer:
    """
    This is a stub class that specifies how to parse a line. It could accept configuration in the future,
    eg diff column numbers if there was more than one file with the same data arranged in diff ways

    It does the work of finding the fields, and of turning the text file into numeric data where appropriate

    The parser is the piece tied to file format, so this must change if the file format changes!
    """

    fields = row.split('\t')
    # For now we clean up three fields exactly.
    # if data format changes!
    fields[0] = fields[0].replace('chr', '')  # chrom
    fields[1] = int(fields[1])  # pos
    fields[10] = float(fields[10])  # pvalue_nominal

    return VariantContainer(*fields)


def query_variant(chrom, pos,
                  tissue: str = None, gene_id: str = None) -> ty.Iterable[VariantContainer]:
    """
    The actual business of querying is isolated to this function. We could replace it with a database or anything else
    later, and as long as it returned a list of objects (with fields accessible by name), it wouldn't matter

    This version optionally filters by ONE gene or ONE tissue if requested
    """
    if not chrom.startswith('chr'):  # Our tabix file happens to use `chr1` format, so make our query match
        chrom = 'chr{}'.format(chrom)

    # FIXME Hardcoded directory structure! Improve!
    source = 'data/All_tissues.allpairs.sorted.5k.txt.gz'
    reader = readers.TabixReader(source, parser=variant_parser, skip_rows=1)
    if tissue:
        reader.add_filter('tissue', tissue)

    if gene_id:
        reader.add_filter('gene_id', gene_id)

    # TODO: This is a hack for the fact that a direct single-variant query fails in pysam (fetch start/end has a weird
    #   definition of intervals, and fetch(region=) is just not giving the results I'd expect). Ask peter/alan for a
    #   more elegant way. Until then, hack by overfetching, and filtering the results we don't want.
    #   How TabixFile.fetch(chrom, start, end) works: https://pysam.readthedocs.io/en/latest/glossary.html#term-region
    #       "Within pysam, coordinates are 0-based, half-open intervals, i.e., the position 10,000 is part of the interval,
    #       but 20,000 is not."
    reader.add_filter('pos', pos)
    return reader.fetch(chrom, pos - 1, pos + 1)
