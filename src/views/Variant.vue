<script>
/**
 * Single-variant view: PheWAS plot with interactive display options
 */
import $ from 'jquery';
import '@/lz-helpers';
import { handleErrors } from '@/util/common';

import LzPlot from '@/components/LzPlot.vue';
import SearchBox from '@/components/SearchBox.vue';
import TabulatorTable from '@/components/TabulatorTable.vue';
import {
  getPlotLayout,
  getPlotSources,
  groupByThing,
  switchY,
  TABLE_BASE_COLUMNS,
  tabulator_tooltip_maker,
} from '@/util/variant-helpers';

function getData(variant) {
  return fetch(`/api/views/variant/${variant}/`)
    .then(handleErrors)
    .then((resp) => resp.json())
    .catch((err) => this.$router.replace({ name: 'error' }));
}

export default {
  name: 'VariantView',
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
      y_field: null,
      group: null,
      n_labels: null,
      tss_distance: null,
      base_plot_sources: null,
      base_plot_layout: null,

      // Internal data passed between widgets
      table_data: [],

      // Internal state
      loading_done: false,
    };
  },
  computed: {
    variant_label() {
      const { chrom, pos, ref, alt, rsid } = this;
      const fields = [`Variant: chr${chrom}:${pos}`];
      if (ref && alt) {
        fields.push(`${ref}/${alt}`);
      }
      if (rsid) {
        fields.push(`(${rsid})`);
      }
      return fields.join(' ');
    },
    pos_start() {
      return Math.max(this.pos - this.tss_distance, 1);
    },
    pos_end() {
      return this.pos + this.tss_distance;
    },
    table_sort() {
      // Update how tabulator is drawn, whenever y_field changes
      return [{ column: `phewas:${this.y_field}`, dir: 'desc' }];
    },
    query_params() {
      // Re-calculate the URL query string whenever dependent information changes.
      const { group, n_labels, tss_distance, y_field } = this;
      return $.param({ group, n_labels, tss_distance, y_field });
    },
    all_options() {
      // Sometimes (eg pageload), we change multiple options, but only want to re-render LZ once
      // This can be done by watching a synthetic compound property.
      // The value doesn't matter, only that it is different every time this runs
      // eslint-disable-next-line no-unused-vars
      const { group, n_labels, tss_distance, y_field } = this;
      return Date.now();
    },
  },
  beforeCreate() {
    // Preserve a reference to component widgets so that their methods can be accessed directly
    //  Some- esp LZ plots- behave very oddly when wrapped as a nested observable; we can
    //  bypass these problems by assigning them as static properties instead of nested
    //  observables.
    this.assoc_plot = null;
    this.assoc_sources = null;

    this.variants_table = null;

    // Make some constants available to the Vue instance for use as props in rendering
    this.table_base_columns = TABLE_BASE_COLUMNS;
    this.tabulator_tooltip_maker = tabulator_tooltip_maker;
  },
  // See: https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-before-navigation
  beforeRouteEnter(to, from, next) {
    // First navigation to route
    getData(to.params.variant)
      .then((data) => {
        next((vm) => {
          vm.setQuery(to.query);
          vm.setData(data);
        });
      }).catch((err) => next({ name: 'error' }));
  },
  beforeRouteUpdate(to, from, next) {
    // When going from one variant page to another (component is reused, only variable part of route changes)
    this.reset();

    getData(to.params.id).then((data) => {
      this.setQuery(to.query);
      this.setData(data);
      next();
    }).catch((err) => next({ name: 'error' }));
  },
  methods: {
    setQuery(params = {}) {
      // Set initial display based on the URL query string, or defaults, as appropriate
      const { group, n_labels, tss_distance, y_field } = params;
      this.group = group || 'tissue';
      this.n_labels = +n_labels || 0;
      this.tss_distance = +tss_distance || 1000000;
      this.y_field = y_field || 'log_pvalue';
    },
    setData(data = {}) {
      const { chrom, pos, ref, alt, top_gene, top_tissue, ac, af, an, rsid, nearest_genes, is_inside_gene } = data;
      // Bulk assign all properties from data to the viewmodel. If there is no data, this
      //  sets all values to undefined.
      Object.assign(
        this,
        { chrom, pos, ref, alt, top_gene, top_tissue, ac, af, an, rsid, nearest_genes, is_inside_gene },
      );

      //  When the page is first loaded, create the plot instance
      this.base_plot_layout = getPlotLayout(
        this.chrom,
        this.pos,
        {
          variant: this.variant,
          position: this.pos,
          chr: this.chrom,
          start: this.pos_start,
          end: this.pos_end,
          minimum_tss_distance: -this.tss_distance,
          maximum_tss_distance: this.tss_distance,
          y_field: this.y_field,
        },
      );
      this.base_plot_sources = getPlotSources(this.chrom, this.pos);

      // If used in reset mode, set loading to true
      this.loading_done = !!data;
    },
    receivePlot(plot, data_sources) {
      this.assoc_plot = plot;
      this.assoc_sources = data_sources;

      plot.subscribeToData(
        [
          'phewas:log_pvalue', 'phewas:gene_id', 'phewas:tissue', 'phewas:system',
          'phewas:symbol', 'phewas:beta', 'phewas:stderr_beta', 'phewas:pip',
        ],
        (data) => { this.table_data = data; },
      );
    },
  },
  reset() {
    this.setQuery();
    this.setData();

    this.assoc_plot = null;
    this.assoc_sources = null;

    this.variants_table = null;
    this.table_data = [];
  },
  watch: {
    group() {
      // Clear "same match" highlighting when re-rendering.
      this.$nextTick(() => {
        groupByThing(this.assoc_plot.layout, this.group);
      });
    },
    y_field() {
      this.$nextTick(() => switchY(this.assoc_plot, this.y_field));
    },
    n_labels() {
      this.$nextTick(() => {
        this.assoc_plot.layout.panels[0].data_layers[0].label.filters[1].value = this.n_labels;
      });
    },
    all_options() {
      // Sometimes, an action will change more than one option (especially happens on first page
      //  load, as we sync the plot with query params)
      // A synthetic watcher lets us re-render the plot only once total, no matter how many options
      //  are changed. Not all the watched variables are *used*, but it triggers dependency tracking.
      this.$nextTick(() => {
        const { assoc_plot, tss_distance, y_field } = this;
        assoc_plot.applyState({
          lz_match_value: null,
          maximum_tss_distance: tss_distance,
          minimum_tss_distance: -tss_distance,
          start: Math.max(assoc_plot.state.position - tss_distance, 1),
          end: assoc_plot.state.position + tss_distance,
          y_field,
        });
      });
    },

    query_params() {
      // Update the URL whenever anything would change the query params
      // We intentionally bypass the Vue router functions here, because we are re-drawing the page
      //  but don't want to trigger a new view. The emphasis is on bookmarking the current view
      window.history.replaceState({}, document.title, `?${this.query_params}`);
    },
  },
  components: {
    LzPlot,
    SearchBox,
    TabulatorTable,
  },
};
</script>

<template>
  <div v-if="!loading_done">
    <div class="d-flex justify-content-center">
      <div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
  <div v-else class="container-fluid">
    <search-box/>

    <div class="row padtop">
      <div class="col-sm-12">
        <h1>{{variant_label}}</h1>
      </div>
    </div>

    <div class="row justify-content-start">
      <div class="col-sm-12">
        <b-dropdown text="Grouping" class="mr-2">
          <b-dropdown-text>
            <label v-b-tooltip.right
                   title="Group eQTLs by tissues, sorted alphabetically">
              <input type="radio" name="group-options" autocomplete="off"
                     v-model="group" value="tissue"> Tissue
            </label>
            <label v-b-tooltip.right
                   title="Group eQTLs by systems as defined by the GTEx project, sorted alphabetically">
              <input type="radio" name="group-options" autocomplete="off"
                     v-model="group" value="system"> System
            </label>
            <label v-b-tooltip.right
                   title="Group eQTLs by gene, sorted by the position of the genes' transcription start sites">
              <input type="radio" name="group-options" autocomplete="off"
                     v-model="group" value="symbol"> Gene
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown text="Y-Axis" class="mr-2">
          <b-dropdown-text>
            <label v-b-tooltip.right.html
                   title="Display -log<sub>10</sub>(P-values) on the Y-axis">
              <input type="radio" name="y-options" v-model="y_field" value="log_pvalue"> P-value
            </label>
            <label v-b-tooltip.right.html
                   title="Displays Normalized Effect Size (NES) on the Y-axis. See <a href='https://www.gtexportal.org/home/documentationPage' target='_blank'>the GTEx Portal</a> for an explanation of NES.">
              <input type="radio" name="y-options" v-model="y_field" value="beta"> Effect Size
            </label>
            <label v-b-tooltip.right.html
                   title="Displays <a href='https://doi.org/10.1371/journal.pgen.1006646' target='_blank'>DAP-G</a> Posterior Inclusion Probabilities (PIP) on the Y-axis.<br>Cluster 1 denotes the cluster of variants (in LD with each other) with the strongest signal; cluster 2 denotes the set of variants with the next strongest signal; and so on.">
              <input type="radio" name="y-options" v-model="y_field" value="pip"> PIP
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown text="Labels" class="mr-2">
          <b-dropdown-text>
            <label v-b-tooltip.right
                   title="Turn off all labels">
              <input type="radio" name="label-options" v-model="n_labels" :value="0"> None
            </label>
            <label v-b-tooltip.right.html
                   title="If viewing P-values, Add labels to the 5 eQTLs with the most significant P-values <b>if they are more significant than 10<sup>-10</sup></b>. If viewing Effect Sizes, choose the eQTLs with the 5 largest absolute effect sizes and only label those with P-value more significant than 10<sup>-20</sup>.">
              <input type="radio" name="label-options" v-model="n_labels" :value="5"> Top 5
            </label>
            <label v-b-tooltip.right.html
                   title="If viewing P-values, add labels to the 20 eQTLs with the most significant P-values <b>if they are more significant than 10<sup>-10</sup></b>. If viewing Effect Sizes, choose the eQTLs with the 20 largest absolute effect sizes and only label those with P-value more significant than 10<sup>-20</sup>.">
              <input type="radio" name="label-options" v-model="n_labels" :value="20"> Top 20
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown class="mr-2">
          <template v-slot:button-content>
            Max TSS Distance <span class="fa fa-info-circle"
                                   v-b-tooltip.bottom.html
                                   title="Display eQTLs for genes <b>only</b> if their Transcription Start Sites (TSS's) are within the selected distance from this variant.">
            <span class="sr-only">Info</span>
          </span>
          </template>
          <b-dropdown-text>
            <b-form-radio-group v-model="tss_distance"
                                name="tss-options"
                                :options="[
                                  {text: '±20kb', value: 20000},
                                  {text: '±50kb', value: 50000},
                                  {text: '±100kb', value: 100000},
                                  {text: '±200kb', value: 200000},
                                  {text: '±50kb', value: 500000},
                                  {text: '±1mb', value: 1000000},
                                ]">
            </b-form-radio-group>
          </b-dropdown-text>
        </b-dropdown>
      </div>
    </div>

    <lz-plot :base_layout="base_plot_layout"
             :base_sources="base_plot_sources"
             :chr="chrom"
             :start="pos_start"
             :end="pos_end"
             @connected="receivePlot" />

    <div class="row">
      <div class="col-sm-12">
        <h2>Variant Information from Sequence Genotype </h2>
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
                    <dt>rsid</dt>
                    <dd>{{ rsid }}</dd>
                  </template>
                  <dt>{{is_inside_gene ? "Overlapping" : "Nearest" }} gene(s)</dt>
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
              <span class="d-inline-block" tabindex="0"
                    v-b-tooltip.top
                    title="External links for more information about this variant">
                <button class="btn btn-sm btn-secondary mr-1" style="pointer-events: none;"><span
                    class="fa fa-secondary-circle"></span><span class="fa fa-info-circle"></span> Variant info </button>
              </span>
              <template v-if="ref!==null && alt !== null">
                <a :href="`https://bravo.sph.umich.edu/freeze5/hg38/variant/${ chrom }-${ pos }-${ ref }-${ alt }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top.html
                   title="Variant data from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>">
                  BRAVO <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`https://gtexportal.org/home/snp/chr${ chrom }_${ pos }_${ ref }_${ alt }_b38`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top
                   title="Variant data from the Genotype-Tissue Expression project, containing expression data, histology images, and in-depth expression data analysis">
                  GTEx Portal <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr${ chrom }%3A${ pos }-${ pos }&position=chr${ chrom }%3A${ pos - 25 }-${ pos + 25 }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top
                   title="The UC Santa Cruz Genome Browser"> UCSC <span
                   class="fa fa-external-link-alt"></span></a>
                <a :href="`https://gnomad.broadinstitute.org/variant/chr${ chrom }-${ pos }-${ ref }-${ alt }?dataset=gnomad_r3`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                    v-b-tooltip.top
                    title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes">
                  gnomAD <span class="fa fa-external-link-alt"></span></a>
              </template>
              <template v-if="rsid !==null">
                <a :href="`https://www.ncbi.nlm.nih.gov/snp/${ rsid }`" target="_blank"
                   class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true" v-b-tooltip.top
                   title="Reference SNP Report from the National Center for Biotechnology Information (NCBI)"> dbSNP
                  <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`http://pheweb.sph.umich.edu/go?query=${ rsid }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top
                   title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative">
                  MGI <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/go?query=${ rsid }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top
                   title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software">
                  UKB-SAIGE <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://big.stats.ox.ac.uk/go?query=${ rsid }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true" v-b-tooltip.top
                   title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software">
                  UKB-Oxford BIG <span class="fa fa-external-link-alt"></span></a>
              </template>
            </div>
          </div>
      </div>
    </div>

    <h2>List of eQTLS for variant</h2>
    <tabulator-table :columns="table_base_columns"
                     :table_data="table_data"
                     :sort="table_sort"
                     :tooltips="tabulator_tooltip_maker"
                     tooltip-generation-mode="hover"
                     :tooltips-header="true" />
  </div>
</template>


<style>
  .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title {
    white-space: normal;
    text-overflow: fade;
  }

  /* Prevent Bootstrap buttons from covering LZ tooltips, by giving render preference to tooltips */
  .lz-data_layer-tooltip {
    z-index: 2
  }
</style>
