import math
import sqlite3
import typing as ty

from zorp import parser_utils, readers  # type: ignore

from .. import model

try:
    # Optional speedup features
    from fastnumbers import int, float  # type: ignore
except ImportError:
    pass


# A convenient lookup used to group multiple tissue types into a smaller number of systems
# For each tissue, provide 1) a related grouping name, and 2) the sample size (from GTEx v8)
TISSUE_DATA = {
    "Adipose_Subcutaneous": ("Adipose Tissue", 581),
    "Adipose_Visceral_Omentum": ("Adipose Tissue", 469),
    "Adrenal_Gland": ("Adrenal Gland", 233),
    "Artery_Aorta": ("Blood Vessel", 387),
    "Artery_Coronary": ("Blood Vessel", 213),
    "Artery_Tibial": ("Blood Vessel", 584),
    "Brain_Amygdala": ("Brain", 129),
    "Brain_Anterior_cingulate_cortex_BA24": ("Brain", 147),
    "Brain_Caudate_basal_ganglia": ("Brain", 194),
    "Brain_Cerebellar_Hemisphere": ("Brain", 175),
    "Brain_Cerebellum": ("Brain", 209),
    "Brain_Cortex": ("Brain", 205),
    "Brain_Frontal_Cortex_BA9": ("Brain", 175),
    "Brain_Hippocampus": ("Brain", 165),
    "Brain_Hypothalamus": ("Brain", 170),
    "Brain_Nucleus_accumbens_basal_ganglia": ("Brain", 202),
    "Brain_Putamen_basal_ganglia": ("Brain", 170),
    "Brain_Spinal_cord_cervical_c-1": ("Brain", 126),
    "Brain_Substantia_nigra": ("Brain", 114),
    "Breast_Mammary_Tissue": ("Breast - Mammary Tissue", 396),
    "Cells_Cultured_fibroblasts": ("Skin", 483),
    "Cells_EBV-transformed_lymphocytes": ("Blood Vessel", 147),
    "Colon_Sigmoid": ("Colon", 318),
    "Colon_Transverse": ("Colon", 368),
    "Esophagus_Gastroesophageal_Junction": ("Esophagus", 330),
    "Esophagus_Mucosa": ("Esophagus", 497),
    "Esophagus_Muscularis": ("Esophagus", 465),
    "Heart_Atrial_Appendage": ("Heart", 372),
    "Heart_Left_Ventricle": ("Heart", 386),
    "Kidney_Cortex": ("Kidney - Cortex", 73),
    "Liver": ("Liver", 208),
    "Lung": ("Lung", 515),
    "Minor_Salivary_Gland": ("Minor Salivary Gland", 144),
    "Muscle_Skeletal": ("Muscle - Skeletal", 706),
    "Nerve_Tibial": ("Nerve - Tibial", 532),
    "Ovary": ("Ovary", 167),
    "Pancreas": ("Pancreas", 305),
    "Pituitary": ("Pituitary", 237),
    "Prostate": ("Prostate", 221),
    "Skin_Not_Sun_Exposed_Suprapubic": ("Skin", 517),
    "Skin_Sun_Exposed_Lower_leg": ("Skin", 605),
    "Small_Intestine_Terminal_Ileum": (
        "Small Intestine - Terminal Ileum",
        174,
    ),
    "Spleen": ("Spleen", 227),
    "Stomach": ("Stomach", 324),
    "Testis": ("Testis", 322),
    "Thyroid": ("Thyroid", 574),
    "Uterus": ("Uterus", 129),
    "Vagina": ("Vagina", 141),
    "Whole_Blood": ("Whole Blood", 670),
}


class VariantContainer:
    """
    Represent the variant data in a standard manner that lets us access fields by name

    This allows us to make changes to how the data is stored (eg column order), but because fields are looked up by
        name, the code is isolated from the impact of changes.
    """

    def __init__(
        self,
        gene_id,
        chrom,
        pos,
        ref,
        alt,
        build,
        tss_distance,
        ma_samples,
        ma_count,
        maf,
        log_pvalue_nominal,
        beta,
        stderr_beta,
        tissue,
        symbol,
        system,
        sample_size,
        *,
        pip_cluster=None,
        spip=None,
        pip=None,
    ):
        self.gene_id = gene_id
        self.chromosome = chrom
        self.position = pos
        self.ref_allele = ref
        self.alt_allele = alt

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
        self.samples = sample_size
        self.pip_cluster = pip_cluster
        self.spip = spip
        self.pip = pip

    @property
    def id_field(self):
        return f"{self.chromosome}:{self.position}_{self.ref_allele}/{self.alt_allele}"

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


class PipAdder:
    """
    Add Posterior Inclusion Probability information to a parsed variant container object
    """

    def __init__(
        self,
        db_path: str,
        chrom: str,
        start: int,
        *,
        end=None,
        tissue=None,
        gene_id=None,
    ):
        # Generate a dictionary to add Posterior Inclusion Probabilities (PIP) to each variant
        # This allows us to perform a single bulk DB lookup per region to reduce time spent on SQL queries
        pip_data = {}
        conn = sqlite3.connect(db_path)

        with conn:
            arglist = [chrom]
            # Build up SQL request based on the query fields given
            sqlcommand = "SELECT * FROM dapg WHERE chrom=?"
            if tissue is not None:
                sqlcommand += " AND tissue=?"
                arglist.append(tissue)
            if gene_id is not None:
                sqlcommand += " AND gene=?"
                arglist.append(gene_id)
            if end is None:
                sqlcommand += " AND pos=?;"
                arglist.append(start)
            else:
                sqlcommand += " AND pos BETWEEN ? AND ?;"
                arglist.extend([start, end])

            # Generate the list of results based on the query request
            dapg = list(conn.execute(sqlcommand, tuple(arglist),))

        # Dictionary Format: pipDict[chrom:pos:ref:alt:tissue:gene_id] = (cluster, spip, pip)
        for line in dapg:
            pip_data[":".join([str(x) for x in line[0:6]])] = line[6:]

        self.pip_data = pip_data

    def __call__(self, variant: VariantContainer) -> VariantContainer:
        # Cluster is a numeric index for a group of variants in LD in the DAP-G model, and are specific to a gene
        # PIP is the Posterior Inclusion Probability for a single variant
        # SPIP is the sum of PIPs for all variants belonging to the same cluster

        default = (0, 0.0, 0.0)
        if self.pip_data is None:
            (cluster, spip, pip) = default
        else:
            # In the PIP dictionary, chrom:pos:ref:alt:tissue:gene (with version number) is used as the Python dict key,
            #  and (cluster, spip, pip) is the value
            (cluster, spip, pip) = self.pip_data.get(
                ":".join(
                    [
                        "chr" + variant.chromosome,
                        str(variant.position),
                        variant.ref_allele,
                        variant.alt_allele,
                        variant.tissue,
                        variant.gene_id,
                    ]
                ),
                default,  # Some variants may lack information
            )

        variant.pip_cluster = cluster
        variant.spip = spip
        variant.pip = pip
        return variant


class VariantParser:
    def __init__(self, tissue=None, pipDict=None):
        # We only need to load the gene locator once per usage, not on every line parsed
        self.gene_json = model.get_gene_names_conversion()
        self.tissue = tissue
        self.pipDict = pipDict

    def __call__(self, row: str) -> VariantContainer:

        """
        This is a stub class that specifies how to parse a line. It could accept configuration in the future,
        eg diff column numbers if there was more than one file with the same data arranged in diff ways

        It does the work of finding the fields, and of turning the text file into numeric data where appropriate

        The parser is the piece tied to file format, so this must change if the file format changes!
        """
        fields: ty.List[ty.Any] = row.split("\t")
        # Revise if data format changes!
        fields[1] = fields[1].replace("chr", "")  # chrom
        if self.tissue:
            # Tissue-specific files have one fewer column, and so the field must
            #   be appended to match the number of fields in the all-tissue file
            tissuevar = self.tissue
            fields.append(tissuevar)
        else:
            tissuevar = fields[13]

        fields[2] = int(fields[2])  # pos
        fields[6] = int(fields[6])  # tss_distance
        fields[7] = int(fields[7])  # ma_samples
        fields[8] = int(fields[8])  # ma_count
        fields[9] = float(fields[9])  # maf
        fields[10] = parser_utils.parse_pval_to_log(
            fields[10], is_neg_log=False
        )  # pvalue_nominal --> serialize as log
        fields[11] = float(fields[11])  # beta
        fields[12] = float(fields[12])  # stderr_beta

        # Append gene symbol
        fields.append(
            self.gene_json.get(fields[0].split(".")[0], "Unknown_Gene")
        )

        # Add tissue grouping and sample size from GTEx
        tissue_data = TISSUE_DATA.get(tissuevar, ("Unknown_Tissue", None))
        fields.extend(tissue_data)
        return VariantContainer(*fields)


def query_variants(
    chrom: str,
    start: int,
    end: int = None,
    tissue: str = None,
    gene_id: str = None,
    piponly: bool = False,
) -> ty.Iterable[VariantContainer]:
    """
    Fetch GTEx data for one or more variants, and apply optional filters
    """
    if not chrom.startswith("chr"):
        # Our tabix file happens to use `chr1` format, so make our query match
        chrom = f"chr{chrom}"

    # If query is single-tissue, use tissue-specific files for faster query
    if tissue:
        source = model.locate_tissue_data(tissue)
    else:  # Otherwise, query from a chromosome-specific file with all tissues
        source = model.locate_data(chrom)

    # Directly pass this PIP dictionary to VariantParser to add cluster, SPIP, and PIP values to data points
    reader = readers.TabixReader(
        source, parser=VariantParser(tissue), skip_rows=1
    )
    # Add posterior incl probability annotations to the parsed data.
    # (Writing as a transform allows us to replace the source of data or even manner of loading
    #   without writing a different parser)
    pip_adder = PipAdder(
        model.get_dapg_path(),
        chrom,
        start,
        end=end,
        tissue=tissue,
        gene_id=gene_id,
    )
    reader.add_transform(pip_adder)

    if gene_id:
        if "." in gene_id:
            reader.add_filter("gene_id", gene_id)
        else:
            # The internal data storage includes gene version (id.version). But the user-driven query may not.
            #   Ensure that the search works with how data is represented internally.
            reader.add_filter("gene_id")
            reader.add_filter(
                lambda result: result.gene_id.split(".")[0] == gene_id
            )

    if end is None:
        # Small hack: when asking for a single point, Pysam sometimes returns more data than expected for half-open
        # intervals. Filter out extraneous information
        reader.add_filter("position", start)

    reader.add_filter("maf")
    reader.add_filter(lambda result: result.maf > 0.0)

    # PIP === 0.0 only if the data point is missing in the DAP-G database.
    # Using this filter returns only points which are found in the DAP-G database.
    if piponly:
        reader.add_filter("pip")
        reader.add_filter(lambda result: result.pip > 0.0)

    if end is None:
        # Single variant query
        try:
            return reader.fetch(chrom, start - 1, start + 1)
        except (ValueError, FileNotFoundError):
            return []
    else:
        # Region query
        try:
            return reader.fetch(chrom, start - 1, end + 1)
        except (ValueError, FileNotFoundError):
            return []
