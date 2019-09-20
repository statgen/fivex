import subprocess, random

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

TISSUE_LIST = list(GROUP_DICT.keys())

GENE_LIST = { 'ENSG00000177757.2',
'ENSG00000186092.4',
'ENSG00000187583.10',
'ENSG00000187608.8',
'ENSG00000187634.11',
'ENSG00000187642.9',
'ENSG00000187961.13',
'ENSG00000188290.10',
'ENSG00000188976.10',
'ENSG00000198744.5',
'ENSG00000223764.2',
'ENSG00000223972.5',
'ENSG00000224969.1',
'ENSG00000225630.1',
'ENSG00000225880.5',
'ENSG00000225972.1',
'ENSG00000227232.5',
'ENSG00000228327.3',
'ENSG00000228463.9',
'ENSG00000228794.8',
'ENSG00000229344.1',
'ENSG00000229376.3',
'ENSG00000230021.8',
'ENSG00000230092.7',
'ENSG00000230368.2',
'ENSG00000230699.2',
'ENSG00000233750.3',
'ENSG00000234711.1',
'ENSG00000237094.11',
'ENSG00000237491.8',
'ENSG00000237973.1',
'ENSG00000238009.6',
'ENSG00000239906.1',
'ENSG00000240361.1',
'ENSG00000240409.1',
'ENSG00000241860.6',
'ENSG00000248527.1',
'ENSG00000250575.1',
'ENSG00000268903.1',
'ENSG00000269981.1',
'ENSG00000272438.1',
'ENSG00000272512.1',
'ENSG00000278566.1',
'ENSG00000279457.4',
'ENSG00000279928.2'
}

currentPos = 50000
with open('../data/chr19.All_Tissues.sorted.txt.gz','w') as w:
    bgzip = subprocess.Popen(["bgzip","-c"], stdin=subprocess.PIPE, stdout=w)
    bgzip.stdin.write('gene_id\tchr\tpos\tref\talt\tbuild\ttss_distance\tma_samples\tma_count\tmaf\tpval_nominal\tslope\tslope_se\ttissue\n'.encode('utf-8'))
    for i in range(1000):
        geneNumber = random.sample(GENE_LIST,1)[0]
        numTissues = random.randrange(5,49)
        currentPos += (i + random.randrange(100,1000))
        tissueList = random.sample(TISSUE_LIST,numTissues)
        for count in range(numTissues):
            (ref,alt) = random.sample(['A','C','G','T'],2)
            tss_distance = random.randrange(-999999,999999)
            ma_count = random.randrange(130,700)
            ma_samples = random.randrange(5,ma_count)
            maf = round(random.random(),6)
            pval_nominal = random.random()
            slope = random.uniform(-0.5, 0.5)
            slope_se = random.uniform(0.01, 1.5)
            tissue = tissueList[count]
            txt = "{}\tchr19\t{}\t{}\t{}\tb38\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\n".format(geneNumber, str(currentPos), ref, alt, str(tss_distance), str(ma_count), str(ma_samples), str(maf), str(pval_nominal), str(slope), str(slope_se), tissue)
            bgzip.stdin.write(txt.encode('utf-8'))
    bgzip.communicate()
temp = subprocess.call(["tabix","-c","g","-s","2","-b","3","-e","3","../data/chr19.All_Tissues.sorted.txt.gz"])
