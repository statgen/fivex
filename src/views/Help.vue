<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>Help</h1>
        <br>
        <h2>Expression Quantitative Trait Loci (eQTLs) and SuSiE</h2>
        <p>
          A longstanding issue in using eQTL association results to elucidate biological mechanisms has been the difficulty of identifying true causal variants for gene expression in the presence of linkage disequilibrium (LD). This is further complicated by the use of P-values in evaluating eQTL significance, which may fail to convey uncertainty about the association results.
        </p>

        <p>
          To address these issues, FIVEx incorporates results from <a href="https://rss.onlinelibrary.wiley.com/doi/10.1111/rssb.12388">SuSiE</a>, a Bayesian variable selection method designed to highlight significantly associated variants in the presence of high correlation (in the form of LD) and quantify the uncertainty of those associations:
        </p>

        <ol>
          <li>Posterior Inclusion Probability (PIP): how likely is it that this variant influences the expression of a given gene in a given tissue?</li>
          <li>Credible set: how many different groups of variants independently influence this expression?</li>
        </ol>

        <p>
          In the <b>region view</b>, variants which appear to be associated with changes in gene expression are grouped into credible sets. Each credible set represents a set of variants within which an association signal exists. The PIP value of a variant indicates the strength of evidence that the variant is the effect variable in SuSiE's model.
        </p>

        <p>
          In the <b>single-variant view</b>, associations are summarized across many different studies, tissues, and genes. The abliity to group data according to various categories makes it easy to see if the variant has significant association signals in specific tissues or genes, along with the size and direction of their effects.
        </p>

        <h2>Splice QTLs and txrevise</h2>
        <p>
          Though eQTLs provide an extensive overview of the relationships between variants and gene expression, it does not contain more detailed information about different transcripts and their related splicing events. Thus, we examine splice QTLs (sQTLs) for a more fine-grained analysis of these splicing events using txrevise <a href="https://doi.org/10.7554/eLife.41673">(Alasoo et al. 2019)</a>.
        </p>
        <p>
          Briefly, txrevise identifies two different groupings of exons for any given gene (see Glossary) for downstream analysis.  A <b>txrevise event</b> contains 3 pieces of information, <b>gene ID, transcript ID, and grouping</b>, in the following format:
        </p>
        <p>
          <b>[gene_ID]</b>.grp_<b>[group]</b>.contained.<b>[transcript_ID]</b>
        </p>
        <p>
          Splice QTL associations are analogous to corresponding eQTL associations, using txrevise events in the place of gene expressions as covariates.
        </p>

        <h2>Glossary</h2>
        <br>
        <dl>
          <dt>Normalized Effect Size (NES)</dt>
          <dd>
            Gene and exon counts were processed through conditional quantile normalization, using either gene or exon lengths, along with GC content, as covariates. Normalized effect sizes were calculated based on these normalized values. Please note that due to the way NES is calculated, it has no direct biological interpretation.
          </dd>
          <dt>Posterior Inclusion Probability (PIP)</dt>
          <dd>
            The probability that a particular variant is causal for a signal within a given credible set. PIP is normalized within a credible set, so that the sum of all PIPs within a set is equal to the probability that the credible set contains a variant with non-zero effect.
          </dd>
          <dt>Transcription Start Site (TSS) distance</dt>
          <dd>
            The distance (in base pairs, bp) from a given variant to the transcription start site of the specified gene. Often (though not always), variants which signficiantly affect expression levels of a gene are found near the TSS.
          </dd>
          <dt>Group (txrevise)</dt>
          <dd>
            <b>Group 1</b> is a more restrictive category, identifying the most number of exons shared by multiple transcripts, and only including transcripts with all of those exons; <b>group 2</b> is a more inclusive category, identifying a scaffold of exons shared between all transcripts. Transcript events are then estimated for each group, separately for each type of event (promoters, internal exons, 3' ends).
          </dd>
          <dt>Event (txrevise)</dt>
          <dd>
            A txrevise event is a systematic description of three different types of alternative transcriptional elements: alternative promoters, differences in exons present in the transcript, and the usage of different 3' ends. Txrevise first identifies shared exon scaffolds, then txrevise generates groups by either including or excluding transcripts based on their shapes relative to these scaffolds.
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
