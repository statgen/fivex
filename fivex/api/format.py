import dataclasses as dc
import gzip
import json
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

# A mapping of all possible tissue names (across studies) to grouped "system" names. Generated manually by @amkwong.
# TODO: Where did the system names come from- is this a standard enum? (@abought)
TISSUES_TO_SYSTEMS = {
    "adipose_naive": "Adipose",
    "adipose_subcutaneous": "Adipose",
    "adipose_visceral": "Adipose",
    "adrenal_gland": "Adrenal Gland",
    "artery_aorta": "Blood Vessel",
    "artery_coronary": "Blood Vessel",
    "artery_tibial": "Blood Vessel",
    "B-cell_naive": "Immune",
    "blood": "Blood",
    "brain": "Brain",
    "brain_amygdala": "Brain",
    "brain_anterior_cingulate_cortex": "Brain",
    "brain_caudate": "Brain",
    "brain_cerebellar_hemisphere": "Brain",
    "brain_cerebellum": "Brain",
    "brain_cortex": "Brain",
    "brain_frontal_cortex": "Brain",
    "brain_hippocampus": "Brain",
    "brain_hypothalamus": "Brain",
    "brain_naive": "Brain",
    "brain_nucleus_accumbens": "Brain",
    "brain_putamen": "Brain",
    "brain_spinal_cord": "Brain",
    "brain_substantia_nigra": "Brain",
    "breast": "Mammary",
    "CD4_T-cell_anti-CD3-CD28": "Immune",
    "CD4_T-cell_naive": "Immune",
    "CD8_T-cell_anti-CD3-CD28": "Immune",
    "CD8_T-cell_naive": "Immune",
    "colon_sigmoid": "Colon",
    "colon_transverse": "Colon",
    "esophagus_gastroesophageal_junction": "Esophagus",
    "esophagus_mucosa": "Esophagus",
    "esophagus_muscularis": "Esophagus",
    "fat": "Adipose",
    "fibroblast": "Skin",
    "heart_atrial_appendage": "Heart",
    "heart_left_ventricle": "Heart",
    "iPSC": "Cell Culture",
    "kidney_cortex": "Kidney",
    "LCL": "Cell Culture",
    "liver": "Liver",
    "lung": "Lung",
    "macrophage_IFNg": "Immune",
    "macrophage_IFNg+Salmonella": "Immune",
    "macrophage_Listeria": "Immune",
    "macrophage_naive": "Immune",
    "macrophage_Salmonella": "Immune",
    "minor_salivary_gland": "Minor Salivary Gland",
    "monocyte": "Immune",
    "monocyte_CD16_naive": "Immune",
    "monocyte_IAV": "Immune",
    "monocyte_LPS": "Immune",
    "monocyte_naive": "Immune",
    "monocyte_Pam3CSK4": "Immune",
    "monocyte_R848": "Immune",
    "muscle": "Muscle",
    "muscle_naive": "Muscle",
    "nerve_tibial": "Nerve",
    "neutrophil": "Immune",
    "NK-cell_naive": "Immune",
    "ovary": "Reproductive",
    "pancreas": "Pancreas",
    "pancreatic_islet": "Pancreas",
    "pituitary": "Pituitary",
    "prostate": "Reproductive",
    "sensory_neuron": "Nerve",
    "skin": "Skin",
    "skin_not_sun_exposed": "Skin",
    "skin_sun_exposed": "Skin",
    "small_intestine": "Small Intestine",
    "spleen": "Spleen",
    "stomach": "Stomach",
    "T-cell": "Immune",
    "testis": "Reproductive",
    "Tfh_memory": "Immune",
    "Th1-17_memory": "Immune",
    "Th17_memory": "Immune",
    "Th1_memory": "Immune",
    "Th2_memory": "Immune",
    "thyroid": "Thyroid",
    "Treg_memory": "Immune",
    "Treg_naive": "Immune",
    "uterus": "Reproductive",
    "vagina": "Reproductive",
}

# A list of the tissue names associated with each study
# TODO: It would be nice if there were a list-of-studies API that showed context / metadata, so people knew what they were looking at.
#   This is something that SQL would be good at, + a custom endpoint
TISSUES_PER_STUDY = {
    "Alasoo_2018": [
        "macrophage_IFNg",
        "macrophage_IFNg+Salmonella",
        "macrophage_naive",
        "macrophage_Salmonella",
    ],
    "BLUEPRINT": ["monocyte", "neutrophil", "T-cell",],
    "BrainSeq": ["brain"],
    "FUSION": ["adipose_naive", "muscle_naive"],
    "GENCORD": ["fibroblast", "LCL", "T-cell"],
    "GEUVADIS": ["LCL"],
    "GTEx": [
        "adipose_subcutaneous",
        "adipose_visceral",
        "adrenal_gland",
        "artery_aorta",
        "artery_coronary",
        "artery_tibial",
        "blood",
        "brain_amygdala",
        "brain_anterior_cingulate_cortex",
        "brain_caudate",
        "brain_cerebellar_hemisphere",
        "brain_cerebellum",
        "brain_cortex",
        "brain_frontal_cortex",
        "brain_hippocampus",
        "brain_hypothalamus",
        "brain_nucleus_accumbens",
        "brain_putamen",
        "brain_spinal_cord",
        "brain_substantia_nigra",
        "breast",
        "colon_sigmoid",
        "colon_transverse",
        "esophagus_gej",
        "esophagus_mucosa",
        "esophagus_muscularis",
        "fibroblast",
        "heart_atrial_appendage",
        "heart_left_ventricle",
        "kidney_cortex",
        "LCL",
        "liver",
        "lung",
        "minor_salivary_gland",
        "muscle",
        "nerve_tibial",
        "ovary",
        "pancreas",
        "pituitary",
        "prostate",
        "skin_not_sun_exposed",
        "skin_sun_exposed",
        "small_intestine",
        "spleen",
        "stomach",
        "testis",
        "thyroid",
        "uterus",
        "vagina",
    ],
    "HipSci": ["iPSC"],
    "Lepik_2017": ["blood"],
    "Nedelec_2016": [
        "macrophage_Listeria",
        "macrophage_naive",
        "macrophage_Salmonella",
    ],
    "Quach_2016": [
        "monocyte_IAV",
        "monocyte_LPS",
        "monocyte_naive",
        "monocyte_Pam3CSK4",
        "monocyte_R848",
    ],
    "ROSMAP": ["brain_naive"],
    "Schmiedel_2018": [
        "B-cell_naive",
        "CD4_T-cell_anti-CD3-CD28",
        "CD4_T-cell_naive",
        "CD8_T-cell_anti-CD3-CD28",
        "CD8_T-cell_naive",
        "monocyte_CD16_naive",
        "monocyte_naive",
        "NK-cell_naive",
        "Tfh_memory",
        "Th1-17_memory",
        "Th17_memory",
        "Th1_memory",
        "Th2_memory",
        "Treg_memory",
        "Treg_naive",
    ],
    "Schwartzentruber_2018": ["sensory_neuron"],
    "TwinsUK": ["blood", "fat", "LCL", "skin"],
    "van_de_Bunt_2015": ["pancreatic_islet"],
}


def position_to_variant_id(
    chromosome: str, position: int, ref_allele: str, alt_allele: str
) -> str:
    """EPACTS-format variant ID, with human-readable comma delimiters"""
    return f"{chromosome}:{position:,}_{ref_allele}/{alt_allele}"


@dc.dataclass
class VariantContainer:
    """
    Represent the data for a single variant
    """

    # The fields from here to rsid are read from tabix-indexed files

    # Study and tissue are not present in study- and tissue-specific files -- these two fields are only present in merged files
    study: str
    tissue: str
    molecular_trait_id: str

    chromosome: str
    position: int
    ref_allele: str
    alt_allele: str

    variant: str  # In EBI format but not used since it is redundant information - @amkwong
    ma_samples: int
    maf: float
    log_pvalue: float  # log_pvalue_nominal

    beta: float
    stderr_beta: float

    vartype: str
    ac: int
    an: int

    r2: float
    molecular_trait_object_id: str

    gene_id: str
    median_tpm: float
    rsid: str
    # end fields that are read from tabix index

    # Begin fields added by parser
    build: str
    tss_distance: int
    symbol: str
    system: str

    # Additional optional args
    pip_cluster: ty.Optional[int] = None
    spip: ty.Optional[float] = None
    pip: ty.Optional[float] = None

    # Computed properties, not passed as param to init
    variant_id: str = dc.field(init=False)  # chrom:pos_ref/alt
    samples: int = dc.field(init=False)

    def __post_init__(self):
        # Add calculated fields
        self.variant_id = position_to_variant_id(
            self.chromosome, self.position, self.ref_allele, self.alt_allele
        )
        self.samples = self.an / 2
        # FIXME: why do we accept constructor arg if never used?
        self.build = "GRCh38"

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
        return dc.asdict(self)


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
    def __init__(self, tissue=None, study=None, pipDict=None):
        # We only need to load the gene locator once per usage, not on every line parsed
        self.gene_json = model.get_gene_names_conversion()
        self.tissue = tissue
        self.study = study
        self.pipDict = pipDict
        with gzip.open(model.locate_tss_data(), "rb") as f:
            self.tss_dict = json.load(f)

    def __call__(self, row: str) -> VariantContainer:

        """
        This is a stub class that specifies how to parse a line. It could accept configuration in the future,
        eg diff column numbers if there was more than one file with the same data arranged in diff ways

        It does the work of finding the fields, and of turning the text file into numeric data where appropriate

        The parser is the piece tied to file format, so this must change if the file format changes!
        """
        fields: ty.List[ty.Any] = row.split("\t")
        # Revise if data format changes!
        # fields[1] = fields[1].replace("chr", "")  # chrom
        if self.tissue and self.study:
            # Tissue-and-study-specific files have two fewer columns (study and tissue),
            # and so the fields must be appended to match the number of fields in the all-tissue file
            tissuevar = self.tissue
            fields = [self.study, tissuevar] + fields
        else:
            tissuevar = fields[1]

        # Field numbers. See also: https://github.com/eQTL-Catalogue/eQTL-Catalogue-resources/blob/master/tabix/Columns.md
        # 0: study
        # 1: tissue
        # 2: molecular_trait_id
        #  for spliceQTLs, this looks like 'ENSG00000008128.grp_1.contained.ENST00000356200'
        # 3: chromosome
        # 4: position (int)
        # 5: ref
        # 6: alt
        # 7: variant (chr_pos_ref_alt)
        # 8: ma_samples (int)
        # 9: maf (float)
        # 10: pvalue (float)
        # 11: beta (float)
        # 12: se (float)
        # 13: type (SNP, INDEL, etc)
        # 14: ac (allele count) (int)
        # 15: an (total number of alleles = 2 * sample size) (int)
        # 16: r2 (float)
        # 17: molecular_trait_object_id
        #  for spliceQTLs, this looks like 'ENSG00000008128.contained'
        # 18: gene_id (ENSG#)
        # 19: median_tpm (float)
        # 20: rsid
        fields[4] = int(fields[4])  # pos
        fields[8] = int(fields[8])  # ma_samples
        fields[9] = float(fields[9])  # maf
        fields[10] = parser_utils.parse_pval_to_log(
            fields[10], is_neg_log=False
        )  # pvalue_nominal --> serialize as log
        fields[11] = float(fields[11])  # beta
        fields[12] = float(fields[12])  # stderr_beta
        fields[14] = int(fields[14])  # allele_count
        fields[15] = int(fields[15])  # total_number_of_alleles
        try:
            fields[16] = float(fields[16])  # r2
        except ValueError:
            # TODO: Make the "NA" -> None check more explicit
            fields[16] = None
        fields[19] = float(fields[19])  # median_tpm  # FIXME: Handle NA case

        # Append build
        build = "GRCh38"

        # Append tss_distance
        gene_tss = self.tss_dict.get(fields[18].split(".")[0], float("nan"))
        tss_distance = math.copysign(1, gene_tss) * (fields[4] - abs(gene_tss))

        # Append gene symbol
        geneSymbol = self.gene_json.get(
            fields[18].split(".")[0], "Unknown_Gene"
        )

        # Add tissue grouping and sample size from GTEx
        # tissue_data = TISSUE_DATA.get(tissuevar, ("Unknown_Tissue", None))
        # fields.extend(tissue_data)

        # Append system information
        tissueSystem = TISSUES_TO_SYSTEMS.get(tissuevar, "Unknown")
        fields.extend([build, tss_distance, geneSymbol, tissueSystem])
        return VariantContainer(*fields)


def query_variants(
    chrom: str,
    start: int,
    rowstoskip: int,
    end: int = None,
    tissue: str = None,
    study: str = None,
    gene_id: str = None,
    piponly: bool = False,
) -> ty.Iterable[VariantContainer]:
    """
    Fetch expression data for one or more variants, and apply optional filters
    """
    # Our previous tabix file happens to use `chr1` format, but the full EBI dataset does not
    # We will need to uncomment the next two lines if a dataset uses the 'chr' prefix
    # if not chrom.startswith("chr"):
    #     chrom = f"chr{chrom}"

    # In fact, we need to strip all leading 'chr' to make sure we don't use the wrong chromosome naming format
    if chrom.startswith("chr"):
        chrom = chrom[3:]

    # If query is for a specific tissue in a certain study, use the study-specific tissue-specific files
    if study and tissue:
        source = model.locate_study_tissue_data(study, tissue)
    # Otherwise, get the data for a single variant from the merged dataset, which is separated into 1MB chunks
    else:
        source = model.locate_data(chrom, start)

    # Directly pass this PIP dictionary to VariantParser to add cluster, SPIP, and PIP values to data points
    reader = readers.TabixReader(
        # The new EBI data format has no header row for the merged files, but a header row for the original data
        source,
        parser=VariantParser(tissue=tissue, study=study),
        skip_rows=rowstoskip,
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
    # Using this filter returns only points which are found in the DAP-G database,
    # and only for points which are genomewide significant (p-value < 5e-8)
    if piponly:
        reader.add_filter("pip")
        reader.add_filter(lambda result: result.pip > 0.0)
        reader.add_filter("log_pvalue")
        reader.add_filter(lambda result: result.log_pvalue > 7.30103)

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
