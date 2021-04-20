<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>Help</h1>
        <h2>Understanding Posterior Inclusion Probabilities and DAP-G</h2>
        <p>
          A longstanding issue in using eQTL association results to elucidate biological mechanisms has been the difficulty of identifying true causal  variants for gene expression in the presence of linkage disequilibrium (LD). This is further complicated by the use of P-values in evaluating eQTL significance, which may fail to convey uncertainty about the association results.
        </p>

        <p>
          To address these issues, FIVEx incorporates results from DAP-G, a Bayesian fine-mapping method designed to highlight significantly associated variants and quantify the uncertainty of those associations. [<a href="https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006646">1</a>][<a href="https://www.biorxiv.org/content/10.1101/316471v1">2</a>][<a href="https://storage.googleapis.com/gtex_analysis_v8/single_tissue_qtl_data/GTEx_v8_finemapping_DAPG.tar">3</a>] DAP-G provides two useful pieces of information:
        </p>

        <ol>
          <li>Posterior Inclusion Probability (PIP): how likely is it that this variant influences the expression of a given gene in a given tissue?</li>
          <li>Clustering of significance signals: how many different groups of variants independently influence this expression?</li>
        </ol>

        <p>
          In the <b>region view</b>, variants which appear to be associated with changes in gene expression are grouped into clusters based on LD. Each cluster represents an independent signal. These clusters are ranked based on the strength of the model's belief in the eQTL: cluster 1 has the strongest signal, followed by cluster 2, and so on). The signal-level PIP (SPIP), equal to the sum of all PIPs within a cluster, indicates the total strength of the signal for that cluster. To make these results easier to understand at a glance, FIVEx only provides unique symbols for the top 4 clusters.
        </p>

        <p>
          In the <b>single-variant view</b>, eQTL associations are summarized across many different genes and tissues, making it easier to see how much a variant may affect the expression of a gene across multiple tissues, or the expression of multiple genes in the same tissue. 
        </p>

        <h2>Glossary</h2>
        FIVEx brings together data from many different sources. The GTEx project provides
        <a href="https://www.gtexportal.org/home/documentationPage">documentation</a> with some common terms, and others
        are described below. Understanding the relevant terminology will help you to interpret the data and get the most
        out of visualizations.
        <dl>
          <dt>Cluster</dt>
          <dd>
            A group of variants in moderate to high linkage disequilibrium (LD) with each other. The model assumes that,
            for each cluster, only one variant is causal for the gene expression association, but due to LD,
            we cannot be sure which variant is causal, so we treat the association signal as coming from the entire cluster.
          </dd>
          <dt>Normalized Effect Size (NES)</dt>
          <dd>
            The normalized effect size (NES) of the eQTLs is computed as the effect of the alternative allele (ALT)
            relative to the reference allele (REF), divided by the sample standard deviation to yield a dimensionless magnitude.
            Please note that due to the way NES is calculated, it has no direct biological interpretation.
          </dd>
          <dt>Posterior Inclusion Probability (PIP)</dt>
          <dd>
            The probability that a particular variant is causal for the cluster association signal. PIP is normalized within
            a cluster, so that the sum of all PIPs within a cluster (SPIP) is equal to the probability that the cluster signal
            is a true signal.
          </dd>
          <dt>Signal-level PIP (SPIP)</dt>
          <dd>
            The sum of all PIPs within a cluster (see PIP above).
          </dd>
          <dt>Transcription Start Site (TSS) distance</dt>
          <dd>
            The distance (in base pairs, bp) from a given variant to the transcription start site of the specified gene. Often (though not always), variants which signficiantly affect expression levels of a gene are found near the TSS.
          </dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script>
export default {
    name: 'Help',
};
</script>
