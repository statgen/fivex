<script>
/**
 * Single-variant view: PheWAS plot with interactive display options
 */
import $ from 'jquery';

import SearchBox from '@/components/SearchBox.vue';

import { handleErrors } from '../util';

function getData(variant) {
  return fetch(`/backend/views/variant/${variant}/`)
    .then(handleErrors)
    .then((resp) => resp.json());
}

export default {
  name: 'VariantView',
  components: {
    SearchBox,
  },
  data() {
    return {
      // Data from the api (describes the variant)
      chrom: null,
      pos: null,
      ref: null,
      alt: null,
      top_gene: null,
      top_tissue: null,
      ac: null,
      af: null,
      an: null,
      rsid: null,
      nearest_genes: null,
      is_inside_gene: null,

      // Data that controls the view (user-selected options)
      y_field: 'log_pvalue',
      group: 'tissue',
      n_labels: 0,
      tss_distance: 1000000,
    };
  },
  // See: https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-before-navigation
  beforeRouteEnter(to, from, next) {
    // First navigation to route
    // TODO: Catch navigation failures (eg bad api call, no data, etc)
    getData(to.params.variant)
      .then((data) => {
        next((vm) => vm.setData(data));
      });
  },
  beforeRouteUpdate(to, from, next) {
    // When going from one variant page to another (component is reused)
    this.setData();
    getData(to.params.id).then((data) => {
      this.setData(data);
      next();
    });
  },
  updated() {
    // Popper tooltips depend on dynamic data. They must be initialized after the component
    //   has finished rendering.
    this.$nextTick(() => {
      $('[data-toggle="tooltip"]').tooltip();
      $('[data-toggle-second="tooltip"]').tooltip();
    });
  },
  methods: {
    setData(data = {}) {
      const {
        chrom, pos, ref, alt, top_gene, top_tissue, ac, af, an, rsid, nearest_genes, is_inside_gene,
      } = data;
      // Bulk assign all properties from data to the viewmodel. If there is no data, this
      //  sets all values to undefined.
      Object.assign(this, {
        chrom,
        pos,
        ref,
        alt,
        top_gene,
        top_tissue,
        ac,
        af,
        an,
        rsid,
        nearest_genes,
        is_inside_gene,
      });
    },
  },
};
</script>

<template>
  <div class="container-fluid">

    <div class="row padtop">
      <div class="col-sm-10">
        <!-- FIXME: This link positioning is wrong. Sorry! -->
        <router-link to="home" class="btn btn-secondary btn-sm" role="button">
          <span class="fa fa-home" aria-hidden="true"></span>
          <span class="sr-only">Home</span>
        </router-link>
        <search-box></search-box>
      </div>
    </div>

    <div class="row padtop">
      <div class="col-sm-12">
        <h1>
          Variant: chr{{ chrom }}:{{ pos ? pos.toLocaleString(): '' }} {{ ref }}/{{ alt }} ({{ rsid }})
        </h1>
      </div>
    </div>

    <div class="row justify-content-start">

      <div class="col-12 col-lg-4" style="margin-bottom:0.8em">
        <form class="grouping" id="grouping-buttons">
          <div class="btn-group btn-group-toggle" data-toggle="buttons">
            <span class="d-inline-block" tabindex="0" data-toggle="tooltip"
                  title="Reorder the x-axis by one of these listed categories" data-placement="top">
              <button type="button" class="btn btn-outline-secondary" style="pointer-events: none;">
                <span class="fa fa-exchange-alt"></span> Group by:
              </button>
            </span>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   title="Group eQTLs by tissues, sorted alphabetically">
              <input type="radio" name="group-options" v-model="group" autocomplete="off" value="tissue"> Tissue
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   title="Group eQTLs by systems as defined by the GTEx project, sorted alphabetically">
              <input type="radio" name="group-options" v-model="group" autocomplete="off" value="system"> System
            </label>
            <label class="btn btn-secondary active" data-toggle="tooltip" data-placement="top"
                   title="Group eQTLs by gene, sorted by the position of the genes' transcription start sites">
              <input type="radio" name="group-options" v-model="group" autocomplete="off" value="symbol"> Gene
            </label>
          </div>
        </form>
      </div>

      <div class="col-12 col-lg-4" style="margin-bottom:0.8em">
        <form class="yaxis-display" id="transform-y">
          <div class="btn-group btn-group-toggle" data-toggle="buttons">
            <span class="d-inline-block" data-html="true" data-toggle="tooltip" tabindex="0"
                  title="Switches the variable plotted on the Y-axis between -log<sub>10</sub>(P-value) and Normalized Effect Size (NES). Triangles indicate eQTLs for upregulation (pointing up) or downregulation (pointing down) of gene expression with P-values < 0.05."
            >
              <button type="button" class="btn btn-outline-secondary" style="pointer-events: none;"> <span
                class="fa fa-arrows-alt-v"></span> Show on Y-Axis: </button>
            </span>
            <label class="btn btn-secondary active" data-toggle="tooltip" data-placement="top"
                   data-html="true"
                   title="Display -log<sub>10</sub>(P-values) on the Y-axis">
              <input type="radio" name="y-options" v-model="y_field" value="log_pvalue"> P-value
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   data-html="true"
                   title="Displays Normalized Effect Size (NES) on the Y-axis. See <a href='https://www.gtexportal.org/home/documentationPage' target='_blank'>the GTEx Portal</a> for an explanation of NES.">
              <input type="radio" name="y-options" v-model="y_field" value="beta"> Effect Size
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   data-html="true"
                   title="Displays <a href='https://doi.org/10.1371/journal.pgen.1006646' target='_blank'>DAP-G</a> Posterior Inclusion Probabilities (PIP) on the Y-axis.<br>Cluster 1 denotes the cluster of variants (in LD with each other) with the strongest signal; cluster 2 denotes the set of variants with the next strongest signal; and so on.">
              <input type="radio" name="y-options" v-model="y_field" value="pip"> PIP
            </label>
          </div>
        </form>
      </div>

      <div class="col-12 col-lg-4" style="margin-bottom:0.8em">
        <form class="label-display" id="toggle-labels">
          <div class="btn-group btn-group-toggle" data-toggle="buttons">
          <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-placement="top"
                data-html="true"
                title="Toggles labels for the most significant eQTLs. Significance is determined by P-values. <b>Will only label variants more significant than 10<sup>-20</sup></b>. When viewing <b>Effect Size (NES)</b>, show either 5 or 50 eQTLs with the largest absolute effects <b>only</b> if they are also more significant than 10<sup>-20</sup></b>.">
            <button type="button" class="btn btn-outline-secondary"
                    style="pointer-events: none;"> <span class="fa fa-tag"></span> Label: </button>
          </span>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   title="Turn off all labels">
              <input type="radio" name="label-options" v-model="n_labels" :value="0"> None
            </label>
            <label class="btn btn-secondary active" data-toggle="tooltip" data-placement="top"
                   data-html="true"
                   title="If viewing P-values, Add labels to the 5 eQTLs with the most significant P-values <b>if they are more significant than 10<sup>-20</sup></b>. If viewing Effect Sizes, choose the eQTLs with the 5 largest absolute effect sizes and only label those with P-value more significant than 10<sup>-20</sup>.">
              <input type="radio" name="label-options" v-model="n_labels" :value="5"> Top 5
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   data-html="true"
                   title="If viewing P-values, add labels to the 50 eQTLs with the most significant P-values <b>if they are most significant than 10<sup>-20</sup></b>. If viewing Effect Sizes, choose the eQTLs with the 50 largest absolute effect sizes and only label those with P-value more significant than 10<sup>-20</sup>.">
              <input type="radio" name="label-options" v-model="n_labels" :value="50"> Top 50
            </label>
          </div>
        </form>
      </div>
    </div>

    <div class="row justify-content-start">
      <div class="col-12" style="margin-bottom:0.8em">
        <form class="tss-range" id="tss-both-range">
          <div class="btn-group btn-group-toggle" data-toggle="buttons">
            <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-html="true"
                  title="Display eQTLs for genes <b>only</b> if their Transcription Start Sites (TSS's) are within the selected distance from this variant.">
              <button type="button" class="btn btn-outline-secondary" style="pointer-events: none;">
                <span class="fa fa-arrows-alt-h"></span> Filter by TSS Distance
              </button>
            </span>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${chrom}:${Math.max(pos - 20000, 1).toLocaleString()}-${(pos + 20000).toLocaleString()}`">
              <input type="radio" name="tss-options" autocomplete=off v-model="tss_distance" :value="20000"> ±20kb
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${ chrom }:${ Math.max(pos - 50000, 1).toLocaleString() }-${ (pos + 50000).toLocaleString() }`">
              <input type="radio" name="tss-options" autocomplete=off v-model="tss_distance" :value="50000"> ±50kb
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${ chrom }:${ Math.max(pos - 100000, 1).toLocaleString() }-${ (pos + 100000).toLocaleString() }`">
              <input type="radio" name="tss-options" autocomplete=off v-model="tss_distance" :value="100000"> ±100kb
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${ chrom }:${ Math.max(pos - 200000, 1).toLocaleString() }-${ (pos + 200000).toLocaleString() }`">
              <input type="radio" name="tss-options" autocomplete=off value="200000"> ±200kb
            </label>
            <label class="btn btn-secondary" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${ chrom }:${ Math.max(pos - 500000, 1).toLocaleString() }-${ (pos + 500000).toLocaleString() }`">
              <input type="radio" name="tss-options" autocomplete=off value="500000"> ±500kb
            </label>
            <label class="btn btn-secondary active" data-toggle="tooltip" data-placement="top"
                   :title="`Show eQTLs for genes with TSS in the range chr${ chrom }:${ Math.max(pos - 1000000, 1).toLocaleString() }-${ (pos + 1000000).toLocaleString() }`">
              <input type="radio" name="tss-options" autocomplete=off value="1000000"> ±1mb
            </label>
          </div>
        </form>
      </div>
    </div>

    <!--     TODO: Now insert plot here! -->

    <div class="row justify-content-center">
      <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-placement="top"
        title="The red dotted line indicates the current variant's position with respect to the scale on the gene track.">
        <span class="badge badge-pill badge-secondary" style="pointer-events: none;"><span class="fa fa-question"></span> Red dotted line </span>
      </span>
    </div>

    <div class="row">
      <div class="col">
        <button class="btn btn-secondary" type="button" data-toggle="collapse" data-target="#variantInformation"
                aria-expanded="true" aria-controls="variantInformation">
          Variant Information from Sequence Genotype <span class="fa fa-caret-down"></span>
        </button>
        <div class="collapse show" id="variantInformation">
          <div class="card-group">
            <div class="card variant-information-grouped-card">
              <div class="card-body">
                <dl class="variant-information-dl">
                  <template v-if="ac !== null && an !== null">
                    <dt>Allele count / total</dt>
                    <dd>{{ ac }} / {{ an }}</dd>
                  </template>
                  <template v-else>
                    <dt>Note:</dt>
                    <dd>Allele information not found</dd>
                  </template>

                  <template v-if="af !== null">
                    <dt>Allele frequency</dt>
                    <dd>{{ af }}</dd>
                  </template>
                </dl>
              </div>
            </div>

            <div class="card variant-information-grouped-card">
              <div class="card-body">
                <dl class="variant-info-middle">
                  <template v-if="top_gene !== null">
                    <dt>Top gene</dt>
                    <dd><i>{{ top_gene }}</i></dd>
                  </template>
                  <template v-if="top_tissue !== null">
                    <dt>Top tissue</dt>
                    <dd>{{ top_tissue }}</dd>
                  </template>
                </dl>
              </div>
            </div>

            <div class="card variant-information-grouped-card">
              <div class="card-body">
                <dl class="variant-information-dl">
                  <template v-if="rsid !== null">
                    <dt>
                      rsid
                    </dt>
                    <dd>
                      {{ rsid }}
                    </dd>
                  </template>
                  <dt>
                    {{is_inside_gene ? "Overlapping" : "Nearest" }} gene(s)
                  </dt>
                  <dd>
                    <i>
                      <span v-for="(gene, index) in nearest_genes" :key="gene.ensg"
                            class="text-with-definition" :title="gene.ensg">
                        {{ gene.symbol }}<span v-if="nearest_genes && index === nearest_genes.length">,</span>
                      </span>
                      <span v-if="!nearest_genes || !nearest_genes.length">(no genes found)</span>
                    </i>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-placement="top"
                    title="External links for more information about this variant">
                <button class="btn btn-sm btn-secondary" style="pointer-events: none;"><span
                    class="fa fa-secondary-circle"></span><span class="fa fa-info-circle"></span> Variant info </button>
              </span>
              <template v-if="ref!==null && alt !== null">
                <a :href="`https://bravo.sph.umich.edu/freeze5/hg38/variant/${ chrom }-${ pos }-${ ref }-${ alt }`" target="_blank"
                    class="btn btn-secondary btn-sm" role="button" aria-pressed="true" data-toggle="tooltip"
                    data-placement="top" data-html=true
                    title="Variant data from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>">
                  BRAVO <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`https://gtexportal.org/home/snp/chr${ chrom }_${ pos }_${ ref }_${ alt }_b38`" target="_blank"
                    class="btn btn-secondary btn-sm" role="button" aria-pressed="true" data-toggle="tooltip"
                    data-placement="top"
                    title="Variant data from the Genotype-Tissue Expression project, containing expression data, histology images, and in-depth expression data analysis">
                  GTEx Portal <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr${ chrom }%3A${ pos }-${ pos }&position=chr${ chrom }%3A${ pos - 25 }-${ pos + 25 }`" target="_blank"
                    class="btn btn-secondary btn-sm" role="button" aria-pressed="true" data-toggle="tooltip"
                    data-placement="top" title="The UC Santa Cruz Genome Browser"> UCSC <span
                    class="fa fa-external-link-alt"></span></a>
                <a :href="`https://gnomad.broadinstitute.org/variant/chr${ chrom }-${ pos }-${ ref }-${ alt }?dataset=gnomad_r3`" target="_blank"
                    class="btn btn-secondary btn-sm" role="button" aria-pressed="true" data-toggle="tooltip"
                    data-placement="top"
                    title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes">
                  gnomAD <span class="fa fa-external-link-alt"></span></a>
              </template>
              <template v-if="rsid !==null">
                <a :href="`https://www.ncbi.nlm.nih.gov/snp/${ rsid }`" target="_blank" class="btn btn-secondary btn-sm" role="button"
                    aria-pressed="true" data-toggle="tooltip" data-placement="top"
                    title="Reference SNP Report from the National Center for Biotechnology Information (NCBI)"> dbSNP
                  <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`http://pheweb.sph.umich.edu/go?query=${ rsid }`" target="_blank" class="btn btn-secondary btn-sm" role="button"
                    aria-pressed="true" data-toggle="tooltip" data-placement="top"
                    title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative">
                  MGI <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/go?query=${ rsid }`" target="_blank" class="btn btn-secondary btn-sm"
                    role="button" aria-pressed="true" data-toggle="tooltip" data-placement="top"
                    title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software">
                  UKB-SAIGE <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://big.stats.ox.ac.uk/go?query=${ rsid }`" target="_blank" class="btn btn-secondary btn-sm" role="button"
                    aria-pressed="true" data-toggle="tooltip" data-placement="top"
                    title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software">
                  UKB-Oxford BIG <span class="fa fa-external-link-alt"></span></a>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!--    TODO: Now insert table here-->

    <div class="card">
      <div class="card-body">
        <a href="https://www.gtexportal.org/home/datasets" class="badge badge-pill badge-secondary"
           data-toggle="tooltip" data-placement="top"
           title="eQTL data was obtained from the GTEx Project, v8, with 49 tissues in up to 670 subjects with both genotypes and expression data">
          <span class="fa fa-file-text-o"></span> Data source <span class="fa fa-external-link-alt"></span> </a>
        <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-placement="top" data-html="true"
              title="Normalized Effect Sizes (NES) are defined as the effect of one allele on the inverse-normalized expression level of the associated gene. Go <a href='https://www.gtexportal.org/home/documentationPage' target='_blank'>here</a> for more details from the GTEx Portal. <br>
                     Posterior Inclusion Probabilities (PIP) were calculated using DAP-G (Wen et al. 2017). See <a href='https://doi.org/10.1371/journal.pgen.1006646' target='_blank'>the associated paper in PLoS Genetics</a> for details.">
        <span class="badge badge-pill badge-secondary" style="pointer-events: none;">
          <span class="fa fa-info-circle"></span> Definitions </span> </span>
        <span class="d-inline-block" tabindex="0" data-toggle="tooltip" data-placement="top" data-html="true"
              title="Created by Alan Kwong, Mukai Wang, Andy Boughton, Peter VandeHaar, and Hyun Min Kang. Source code can be found on <a href=https://github.com/statgen/pheget/>GitHub</a>.">
        <span class="badge badge-pill badge-secondary" style="pointer-events: none;"><span
            class="fa fa-lightbulb"></span> Credits</span>
      </span>
      </div>
    </div>
  </div>
</template>


<style>
  .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title {
    white-space: normal;
    text-overflow: clip;
  }

  .tooltip a {
    text-decoration: underline;
  }

  /* Prevent Bootstrap buttons from covering LZ tooltips, by giving render preference to tooltips */
  .lz-data_layer-tooltip {
    z-index: 2
  }
</style>
