<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>Help</h1>
        <h2>Understanding Posterior Inclusion Probabilities and DAP-G</h2>
        <p>
          A common problem in interpreting eQTL results is to untangle the evolutionary relationships between variants that are frequently inherited together, in order to understand which (and how many) variants are directly influencing observed biology.
        </p>

        <p>
          To address this question, FIVEx incorporates results from DAP-G, a fine-mapping procedure designed to highlight variants of particular significance. [<a href="https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006646">1</a>][<a href="https://www.biorxiv.org/content/10.1101/316471v1">2</a>][<a href="https://storage.googleapis.com/gtex_analysis_v8/single_tissue_qtl_data/GTEx_v8_finemapping_DAPG.tar">3</a>] DAP-G provides two useful pieces of information:
        </p>

        <ol>
          <li>Calculated Posterior Inclusion Probability (PIP): how likely is it that this variant influences the expression of a given gene in a given tissue?</li>
          <li>Clustering of significance results: how many different (groups of) variants will independently influence this expression?</li>
        </ol>

        <p>
          In the <em> region view</em>, each cluster will represent an independent signal (eg, variants that are in high LD with each other), and clusters are ranked with numbers based on how strongly they influence the eQTL: cluster 1 has the strongest influence, then cluster 2, etc) The sum of PIP values (SPIP) can be used to identify if this cluster represents a signal of particular interest. Typically there are not many independent signals for a given eQTL, and as a result, FIVEx only shows the top 4 clusters.
        </p>

      <p>
        In the single-variant view, results are summarized across many different genes or tissues. In this case, the DAP-G PIPs and cluster information are not directly comparable, but they provide a quick visual summary: "show me any genes and tissues where this variant was of particular interest".
      </p>

        <h2>Glossary</h2>
        FIVEx brings together data from many different sources. The GTEx project provides
        <a href="https://www.gtexportal.org/home/documentationPage">documentation</a> with some common terms, and others
        are described below. Understanding the relevant terminology will help you to interpret the data and get the most
        out of visualizations.
        <dl>
          <dt>Normalized Effect Size (NES)</dt>
          <dd>
            The normalized effect size (NES) of the eQTLs is computed as the effect of the alternative allele (ALT)
            relative to the reference allele (REF).
          </dd>

          <dt>PIP, SPIP, and cluster</dt>
          <dd>
            See the help text above for more details.
          </dd>

          <dt>Transcription Start Site (TSS) distance</dt>
          <dd>
            The distance (in base pairs, bp) from a given variant to the transcription start site of the specified gene. Often (though not always), variants close to a gene are more likely to be impactful on expression levels of that gene.
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
