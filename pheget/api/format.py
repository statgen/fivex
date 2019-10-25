import typing as ty
import pickle

try:
    # Optional speedup features
    from fastnumbers import int, float
except ImportError:
    pass

from zorp import readers
import pheget

with open('data/gene.symbol.pickle', 'rb') as f:
    SYMBOL_DICT = pickle.load(f)


def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info

    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split('_')
    return chrom, int(pos)


# A convenient lookup used to group multiple tissue types into a smaller number of systems
GROUP_DICT = {
    "Adipose_Subcutaneous": "Adipose Tissue",
    "Adipose_Visceral_Omentum": "Adipose Tissue",
    "Adrenal_Gland": "Adrenal Gland",
    "Artery_Aorta": "Blood Vessel",
    "Artery_Coronary": "Blood Vessel",
    "Artery_Tibial": "Blood Vessel",
    "Brain_Amygdala": "Brain",
    "Brain_Anterior_cingulate_cortex_BA24": "Brain",
    "Brain_Caudate_basal_ganglia": "Brain",
    "Brain_Cerebellar_Hemisphere": "Brain",
    "Brain_Cerebellum": "Brain",
    "Brain_Cortex": "Brain",
    "Brain_Frontal_Cortex_BA9": "Brain",
    "Brain_Hippocampus": "Brain",
    "Brain_Hypothalamus": "Brain",
    "Brain_Nucleus_accumbens_basal_ganglia": "Brain",
    "Brain_Putamen_basal_ganglia": "Brain",
    "Brain_Spinal_cord_cervical_c-1": "Brain",
    "Brain_Substantia_nigra": "Brain",
    "Breast_Mammary_Tissue": "Breast - Mammary Tissue",
    "Cells_Cultured_fibroblasts": "Skin",
    "Cells_EBV-transformed_lymphocytes": "Blood Vessel",
    "Colon_Sigmoid": "Colon",
    "Colon_Transverse": "Colon",
    "Esophagus_Gastroesophageal_Junction": "Esophagus",
    "Esophagus_Mucosa": "Esophagus",
    "Esophagus_Muscularis": "Esophagus",
    "Heart_Atrial_Appendage": "Heart",
    "Heart_Left_Ventricle": "Heart",
    "Kidney_Cortex": "Kidney - Cortex",
    "Liver": "Liver",
    "Lung": "Lung",
    "Minor_Salivary_Gland": "Minor Salivary Gland",
    "Muscle_Skeletal": "Muscle - Skeletal",
    "Nerve_Tibial": "Nerve - Tibial",
    "Ovary": "Ovary",
    "Pancreas": "Pancreas",
    "Pituitary": "Pituitary",
    "Prostate": "Prostate",
    "Skin_Not_Sun_Exposed_Suprapubic": "Skin",
    "Skin_Sun_Exposed_Lower_leg": "Skin",
    "Small_Intestine_Terminal_Ileum": "Small Intestine - Terminal Ileum",
    "Spleen": "Spleen",
    "Stomach": "Stomach",
    "Testis": "Testis",
    "Thyroid": "Thyroid",
    "Uterus": "Uterus",
    "Vagina": "Vagina",
    "Whole_Blood": "Whole Blood"
}


class VariantContainer:
    """
    Represent the variant data in a standard manner that lets us access fields by name

    This allows us to make changes to how the data is stored (eg column order), but because fields are looked up by
        name, the code is isolated from the impact of changes.
    """

    def __init__(self, gene_id, chrom, pos, ref, alt, build,
                 tss_distance,
                 ma_samples, ma_count, maf,
                 pval_nominal, slope, slope_se,
                 tissue, symbol, system):
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
        self.symbol = symbol
        self.system = system

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
    # Revise if data format changes!
    fields[1] = fields[1].replace('chr', '')  # chrom
    fields[2] = int(fields[2])  # pos
    fields[10] = float(fields[10])  # pvalue_nominal
    fields.append(SYMBOL_DICT.get(fields[0].split(".")[0], 'Unknown_Gene'))  # Add gene symbol
    fields.append(GROUP_DICT.get(fields[13], 'Unknown_Tissue'))  # Add tissue system from GTEx
    return VariantContainer(*fields)


def query_variant(chrom: str, pos: int,
                  tissue: str = None, gene_id: str = None) -> ty.Iterable[VariantContainer]:
    """
    The actual business of querying is isolated to this function. We could replace it with a database or anything else
    later, and as long as it returned a list of objects (with fields accessible by name), it wouldn't matter

    This version optionally filters by ONE gene or ONE tissue if requested
    """
    if not chrom.startswith('chr'):  # Our tabix file happens to use `chr1` format, so make our query match
        chrom = 'chr{}'.format(chrom)

    # FIXME Hardcoded directory structure! Improve!
    source = pheget.model.locate_data(chrom)  # Faster retrieval for a single variant
    # source = 'data/chr19.6718376.ENSG00000031823.14.All_Tissues.sorted.txt.gz' # for single variant single tissue
    # multiple genes in this region; variant of interest is chr19:6718376 (rs2230199)
    reader = readers.TabixReader(source, parser=variant_parser, skip_rows=1)
    if tissue:
        reader.add_filter('tissue', tissue)

    if gene_id:
        reader.add_filter('gene_id', gene_id)

    # TODO: This is a hack for the fact that a direct single-variant query fails in pysam (fetch start/end has a weird
    #   definition of intervals, and fetch(region=) is just not giving the results I'd expect). Ask peter/alan for a
    #   more elegant way. Until then, hack by overfetching, and filtering the results we don't want.
    #   How TabixFile.fetch(chrom, start, end) works: https://pysam.readthedocs.io/en/latest/glossary.html#term-region
    #       "Within pysam, coordinates are 0-based, half-open intervals, i.e., the position 10,000 is part of the
    #       interval, but 20,000 is not."
    reader.add_filter('pos', pos)
    return reader.fetch(chrom, pos - 1, pos + 1)
