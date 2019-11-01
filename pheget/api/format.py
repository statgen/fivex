import math
import typing as ty
import pickle

try:
    # Optional speedup features
    from fastnumbers import int, float
except ImportError:
    pass

from zorp import parser_utils, readers

import pheget

with open(pheget.app.config['DATA_DIR'] + '/gene.symbol.pickle', 'rb') as f:
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

# Sample sizes from GTEx v8
SAMPLESIZE_DICT = {
    "Adipose_Subcutaneous": 581,
    "Adipose_Visceral_Omentum": 469,
    "Adrenal_Gland": 233,
    "Artery_Aorta": 387,
    "Artery_Coronary": 213,
    "Artery_Tibial": 584,
    "Brain_Amygdala": 129,
    "Brain_Anterior_cingulate_cortex_BA24": 147,
    "Brain_Caudate_basal_ganglia": 194,
    "Brain_Cerebellar_Hemisphere": 175,
    "Brain_Cerebellum": 209,
    "Brain_Cortex": 205,
    "Brain_Frontal_Cortex_BA9": 175,
    "Brain_Hippocampus": 165,
    "Brain_Hypothalamus": 170,
    "Brain_Nucleus_accumbens_basal_ganglia": 202,
    "Brain_Putamen_basal_ganglia": 170,
    "Brain_Spinal_cord_cervical_c-1": 126,
    "Brain_Substantia_nigra": 114,
    "Breast_Mammary_Tissue": 396,
    "Cells_Cultured_fibroblasts": 483,
    "Cells_EBV-transformed_lymphocytes": 147,
    "Colon_Sigmoid": 318,
    "Colon_Transverse": 368,
    "Esophagus_Gastroesophageal_Junction": 330,
    "Esophagus_Mucosa": 497,
    "Esophagus_Muscularis": 465,
    "Heart_Atrial_Appendage": 372,
    "Heart_Left_Ventricle": 386,
    "Kidney_Cortex": 73,
    "Liver": 208,
    "Lung": 515,
    "Minor_Salivary_Gland": 144,
    "Muscle_Skeletal": 706,
    "Nerve_Tibial": 532,
    "Ovary": 167,
    "Pancreas": 305,
    "Pituitary": 237,
    "Prostate": 221,
    "Skin_Not_Sun_Exposed_Suprapubic": 517,
    "Skin_Sun_Exposed_Lower_leg": 605,
    "Small_Intestine_Terminal_Ileum": 174,
    "Spleen": 227,
    "Stomach": 324,
    "Testis": 322,
    "Thyroid": 574,
    "Uterus": 129,
    "Vagina": 141,
    "Whole_Blood": 670
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
                 log_pvalue_nominal, beta, stderr_beta,
                 tissue, symbol, system, sample_size):
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

        self.log_pvalue = log_pvalue_nominal
        self.beta = beta
        self.stderr_beta = stderr_beta

        self.tissue = tissue
        self.symbol = symbol
        self.system = system
        self.sample_size = sample_size

    @property
    def pvalue(self):
        if self.log_pvalue is None:
            return None
        elif math.isinf(self.log_pvalue):
            # This is an explicit design choice here, since we parse p=0 to infinity
            return 0
        else:
            return 10 ** -self.log_pvalue

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
    fields[6] = int(fields[6])  # tss_distance
    fields[10] = parser_utils.parse_pval_to_log(fields[10], is_neg_log=False)  # pvalue_nominal --> serialize as log
    fields[11] = float(fields[11])  # beta
    fields[12] = float(fields[12])  # stderr_beta
    fields.append(SYMBOL_DICT.get(fields[0].split(".")[0], 'Unknown_Gene'))  # Add gene symbol
    fields.append(GROUP_DICT.get(fields[13], 'Unknown_Tissue'))  # Add tissue system from GTEx
    fields.append(SAMPLESIZE_DICT.get(fields[13], -1))  # Add sample sizes from GTEx v8
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

    source = pheget.model.locate_data(chrom)  # Faster retrieval for a single variant
    reader = readers.TabixReader(source, parser=variant_parser, skip_rows=1)

    # Filters for tissue and gene name
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
