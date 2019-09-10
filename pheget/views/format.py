import typing as ty

try:
    # Optional speedup features
    from fastnumbers import int, float
except ImportError:
    pass

from zorp import readers
import pheget

def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info

    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split('_')
    return chrom, int(pos)



class VariantContainer:
    """
    Represent the variant data in a standard manner that lets us access fields by name

    This allows us to make changes to how the data is stored, but all our code can still access the fields it wants
    without being changed
    """
    def __init__(self, gene_id, chrom, pos, ref, alt, build, # swapped gene_id field to the beginning of the row
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
    groupDict = {"Adipose_Subcutaneous":"Connective Tissue",
"Adipose_Visceral_Omentum":"Connective Tissue",
"Adrenal_Gland":"Endocrine",
"Artery_Aorta":"Circulatory",
"Artery_Coronary":"Circulatory",
"Artery_Tibial":"Circulatory",
"Brain_Amygdala":"Nervous",
"Brain_Anterior_cingulate_cortex_BA24":"Nervous",
"Brain_Caudate_basal_ganglia":"Nervous",
"Brain_Cerebellar_Hemisphere":"Nervous",
"Brain_Cerebellum":"Nervous",
"Brain_Cortex":"Nervous",
"Brain_Frontal_Cortex_BA9":"Nervous",
"Brain_Hippocampus":"Nervous",
"Brain_Hypothalamus":"Nervous",
"Brain_Nucleus_accumbens_basal_ganglia":"Nervous",
"Brain_Putamen_basal_ganglia":"Nervous",
"Brain_Spinal_cord_cervical_c-1":"Nervous",
"Brain_Substantia_nigra":"Nervous",
"Breast_Mammary_Tissue":"Connective Tissue",
"Cells_Cultured_fibroblasts":"Cultured Cells",
"Cells_EBV-transformed_lymphocytes":"Cultured Cells",
"Colon_Sigmoid":"Digestive",
"Colon_Transverse":"Digestive",
"Esophagus_Gastroesophageal_Junction":"Digestive",
"Esophagus_Mucosa":"Digestive",
"Esophagus_Muscularis":"Digestive",
"Heart_Atrial_Appendage":"Circulatory",
"Heart_Left_Ventricle":"Circulatory",
"Kidney_Cortex":"Renal",
"Liver":"Digestive",
"Lung":"Respiratory",
"Minor_Salivary_Gland":"Digestive",
"Muscle_Skeletal":"Muscular",
"Nerve_Tibial":"Nervous",
"Ovary":"Reproductive",
"Pancreas":"Endocrine",
"Pituitary":"Endocrine",
"Prostate":"Reproductive",
"Skin_Not_Sun_Exposed_Suprapubic":"Integumentary",
"Skin_Sun_Exposed_Lower_leg":"Integumentary",
"Small_Intestine_Terminal_Ileum":"Digestive",
"Spleen":"Immune",
"Stomach":"Digestive",
"Testis":"Reproductive",
"Thyroid":"Endocrine",
"Uterus":"Reproductive",
"Vagina":"Reproductive",
"Whole_Blood":"Hematopoietic"}

    fields = row.split('\t')
    # For now we clean up three fields exactly.
    # if data format changes!
    fields[1] = fields[1].replace('chr', '')  # chrom
    fields[2] = int(fields[2])  # pos
    fields[10] = float(fields[10])  # pvalue_nominal
    fields.append(groupDict[fields[13]]) # add system to the end as an additional field

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
    source = pheget.model.locate_data() # Faster retrieval for a single variant
    #source = 'data/chr19.6718376.ENSG00000031823.14.All_Tissues.sorted.txt.gz' # for single variant single tissue
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
    return reader.fetch(chrom, pos - 1 , pos + 1)
