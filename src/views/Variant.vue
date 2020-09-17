<script>
/**
 * Single-variant view: PheWAS plot with interactive display options
 */
import $ from 'jquery';
import '@/lz-helpers';
import { deNamespace, handleErrors } from '@/util/common';

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
    components: {
        LzPlot,
        SearchBox,
        TabulatorTable,
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
            const fields = ['cis-eQTLs associated with variant:'];
            const postext = parseInt(pos, 10).toLocaleString();
            if (rsid) {
                fields.push(`${rsid}`);
                fields.push(`(chr${chrom}:${postext}`);
                if (ref && alt) {
                    fields.push(`${ref}/${alt})`);
                }
            } else {
                fields.push(`chr${chrom}:${postext}`);
                if (ref && alt) {
                    fields.push(`${ref}/${alt}`);
                }
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
            return [{ column: this.y_field, dir: 'desc' }];
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
    watch: {
        group() {
            // Clear "same match" highlighting when re-rendering.
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => {
                groupByThing(this.$refs.phewas_plot.plot.layout, this.group);
            });
        },
        y_field() {
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => switchY(this.$refs.phewas_plot.plot, this.y_field));
        },
        n_labels() {
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => {
                this.$refs.phewas_plot.plot.layout.panels[0].data_layers[0].label.filters[1].value = this.n_labels;
            });
        },
        all_options() {
            // Sometimes, an action will change more than one option (especially happens on first page
            //  load, as we sync the plot with query params)
            // A synthetic watcher lets us re-render the plot only once total, no matter how many options
            //  are changed. Not all the watched variables are *used*, but it triggers dependency tracking.
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => {
                // eslint-disable-next-line no-unused-vars
                const { group, n_labels, tss_distance, y_field } = this;
                this.$refs.phewas_plot.callPlot(
                    'applyState',
                    {
                        lz_match_value: null,
                        maximum_tss_distance: tss_distance,
                        minimum_tss_distance: -tss_distance,
                        start: this.pos_start,
                        end: this.pos_end,
                        y_field,
                    },
                );
            });
        },

        query_params() {
            // Update the URL whenever anything would change the query params
            // We intentionally bypass the Vue router functions here, because we are re-drawing the page
            //  but don't want to trigger a new view. The emphasis is on bookmarking the current view
            window.history.replaceState({}, document.title, `?${this.query_params}`);
        },
    },
    beforeCreate() {
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
    // this.reset();
        this.setData();

        getData(to.params.variant).then((data) => {
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

            const has_data = !!Object.keys(data).length;

            if (has_data) {
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
            }

            // If used in reset mode, set loading to true
            this.loading_done = has_data;
        },
        reset() {
            this.loading_done = false;

            this.setQuery();
            this.setData();

            this.table_data = [];
        },
        onPlotConnected() {
            // Connect (or disconnect) a plot instance as components are added/removed
            // This allows the parent to manipulate LocusZoom... but also to avoid preserving a reference
            this.$refs.phewas_plot.callPlot(
                'subscribeToData',
                [
                    'phewas:log_pvalue', 'phewas:gene_id', 'phewas:tissue', 'phewas:system',
                    'phewas:symbol', 'phewas:beta', 'phewas:stderr_beta', 'phewas:pip',
                    'phewas:pip_cluster',
                    'phewas:chromosome', // Added this so we can link from the table in our single variant view to a region view page (the linking url requires chromosome, gene, and tissue)
                ],
                (data) => {
                    // Data sent from locuszoom contains a prefix (phewas:). We'll remove that prefix before
                    // using it in tabulator, so that tabulator layouts can be written that also work with
                    // data directly from the API (where there is no prefix)
                    this.table_data = data.map((item) => deNamespace(item));
                },
            );
        },
        goto(refName) {
            const element = this.$refs[refName];
            element.scrollIntoView({ behavior: 'smooth' });
        },
    },
};
</script>

<template>
  <div v-if="!loading_done">
    <div class="d-flex justify-content-center">
      <div
        class="spinner-border"
        role="status"
      >
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
  <div
    v-else
    class="container-fluid padsides"
  >
    <b-navbar
      class="py-0"
      type="light"
      variant="light"
      fixed="top"
    >
      <b-collapse is-nav>
        <h6 class="mr-2">
          Jump to:
        </h6>
        <b-button
          class="mr-2 btn-light btn-link"
          size="sm"
          @click="goto('single-variant-eqtl-plot')"
        >
          Plot <span class="fas fa-level-down-alt" />
        </b-button>
        <b-button
          class="mr-2 btn-light btn-link"
          size="sm"
          @click="goto('genotype-infobox')"
        >
          Variant Info <span class="fas fa-level-down-alt" />
        </b-button>
        <b-button
          class="mr-2 btn-light btn-link"
          size="sm"
          @click="goto('eqtl-table')"
        >
          eQTL Table <span class="fas fa-level-down-alt" />
        </b-button>
        <b-navbar-nav class="ml-auto">
          <search-box class="searchbox" />
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <div
      ref="single-variant-eqtl-plot"
      class="row padtop"
    >
      <div class="col-sm-12">
        <h1>
          <strong>
            {{ variant_label }}
          </strong>
        </h1>
      </div>
    </div>
    <div class="row justify-content-start">
      <div class="col-sm-12">
        <b-dropdown
          text="X-Axis Group"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-text>
            <label>
              <span class="nobreak"><input
                v-model="group"
                type="radio"
                name="group-options"
                autocomplete="off"
                value="tissue"
              > Tissue <span
                id="x-axis-radio-tissue"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="x-axis-radio-tissue">
                Group eQTLs by tissues, sorted alphabetically
              </b-popover>
            </label>
            <label>
              <span class="nobreak"><input
                v-model="group"
                type="radio"
                name="group-options"
                autocomplete="off"
                value="system"
              > System <span
                id="x-axis-radio-system"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="x-axis-radio-system">
                Group eQTLs by systems as defined by the GTEx project, sorted alphabetically
              </b-popover>
            </label>
            <label>
              <span class="nobreak"><input
                v-model="group"
                type="radio"
                name="group-options"
                autocomplete="off"
                value="symbol"
              > Gene <span
                id="x-axis-radio-gene"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="x-axis-radio-gene">
                Group eQTLs by gene, sorted by the position of the genes' transcription start sites
              </b-popover>
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown
          text="Y-Axis"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-text>
            <label>
              <input
                v-model="y_field"
                type="radio"
                name="y-options"
                value="log_pvalue"
              > -log<sub>10</sub> P
            </label>
            <label>
              <span class="nobreak"><input
                v-model="y_field"
                type="radio"
                name="y-options"
                value="beta"
              > Effect size <span
                id="y-axis-radio-effectsize"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="y-axis-radio-effectsize">
                Displays Normalized Effect Size (NES) on the Y-axis. See <a
                  href="https://www.gtexportal.org/home/documentationPage"
                  target="_blank"
                >the GTEx Portal</a> for an explanation of NES.
              </b-popover>
            </label>
            <label>
              <span class="nobreak"><input
                v-model="y_field"
                type="radio"
                name="y-options"
                value="pip"
              > PIP <span
                id="y-axis-radio-pip"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="y-axis-radio-pip">
                Displays <a
                  href="https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006646"
                  target="_blank"
                >DAP-G</a> Posterior Inclusion Probabilities (PIP) on the Y-axis.<br>Cluster 1 denotes the cluster of variants (in LD with each other) with the strongest signal; cluster 2 denotes the set of variants with the next strongest signal; and so on.
              </b-popover>
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown
          text="Labels"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-text>
            <label>
              <span class="nobreak"><input
                v-model="n_labels"
                type="radio"
                name="label-options"
                :value="0"
              > No labels <span
                id="labels-radio-none"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="labels-radio-none">
                Turn off all labels
              </b-popover>
            </label>
            <label>
              <span class="nobreak"><input
                v-model="n_labels"
                type="radio"
                name="label-options"
                :value="5"
              > Top 5 <span
                id="labels-radio-5"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="labels-radio-5">
                If viewing P-values, add labels to the 5 most significant eQTLs by P-value <b>if they are more significant than 10<sup>-10</sup></b>.<br><br>If viewing Effect Sizes, choose the eQTLs with the 5 largest absolute effect sizes and only label those with P-values more significant than 10<sup>-20</sup>.
              </b-popover>
            </label>
            <label>
              <span class="nobreak"><input
                v-model="n_labels"
                type="radio"
                name="label-options"
                :value="20"
              > Top 20 <span
                id="labels-radio-20"
                class="fa fa-info-circle"
              /></span>
              <b-popover target="labels-radio-20">
                If viewing P-values, add labels to the 20 most significant eQTLs by P-value <b>if they are more significant than 10<sup>-10</sup></b>.<br><br>If viewing Effect Sizes, choose the eQTLs with the 20 largest absolute effect sizes and only label those with P-values more significant than 10<sup>-20</sup>.
              </b-popover>
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown
          class="mr-2"
          size="sm"
        >
          <template v-slot:button-content>
            <span
              v-b-tooltip.bottom.html
              class="fa fa-info-circle"
              title="Display eQTLs for genes <b>only</b> if their Transcription Start Sites (TSS's) are within the selected distance from this variant."
            >
              <span class="sr-only">Info</span>
            </span>
            Max TSS dist. (bp)
          </template>
          <b-dropdown-text>
            <b-form-radio-group
              v-model="tss_distance"
              name="tss-options"
              :options="[
                {text: '±20k', value: 20000},
                {text: '±50k', value: 50000},
                {text: '±100k', value: 100000},
                {text: '±200k', value: 200000},
                {text: '±500k', value: 500000},
                {text: '±1m', value: 1000000},
              ]"
            />
          </b-dropdown-text>
        </b-dropdown>
      </div>
    </div>

    <lz-plot
      ref="phewas_plot"
      :base_layout="base_plot_layout"
      :base_sources="base_plot_sources"
      :chr="chrom"
      :start="pos_start"
      :end="pos_end"
      @connected="onPlotConnected"
    />

    <div
      ref="genotype-infobox"
      class="row padtop"
    >
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
                <dt>{{ is_inside_gene ? "Overlapping" : "Nearest" }} gene(s)</dt>
                <dd>
                  <i>
                    <span
                      v-for="(gene, index) in nearest_genes"
                      :key="gene.ensg"
                      class="text-with-definition"
                      :title="gene.ensg"
                    >
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
            External links:
            <template v-if="ref!==null && alt !== null">
              <a
                v-b-tooltip.top.html
                :href="`https://bravo.sph.umich.edu/freeze5/hg38/variant/${ chrom }-${ pos }-${ ref }-${ alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Variant data from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>"
              >
                BRAVO <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`https://gtexportal.org/home/snp/chr${ chrom }_${ pos }_${ ref }_${ alt }_b38`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Variant data from the Genotype-Tissue Expression project, containing expression data, histology images, and in-depth expression data analysis"
              >
                GTEx Portal <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr${ chrom }%3A${ pos }-${ pos }&position=chr${ chrom }%3A${ pos - 25 }-${ pos + 25 }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="The UC Santa Cruz Genome Browser"
              > UCSC <span
                class="fa fa-external-link-alt"
              /></a>
              <a
                v-b-tooltip.top
                :href="`https://gnomad.broadinstitute.org/variant/chr${ chrom }-${ pos }-${ ref }-${ alt }?dataset=gnomad_r3`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes"
              >
                gnomAD <span class="fa fa-external-link-alt" /></a>
            </template>
            <template v-if="rsid !==null">
              <a
                v-b-tooltip.top
                :href="`https://www.ncbi.nlm.nih.gov/snp/${ rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Reference SNP Report from the National Center for Biotechnology Information (NCBI)"
              > dbSNP
                <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`http://pheweb.sph.umich.edu/go?query=${ rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative"
              >
                MGI <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/go?query=${ rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software"
              >
                UKB-SAIGE <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`http://big.stats.ox.ac.uk/go?query=${ rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software"
              >
                UKB-Oxford BIG <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`https://genetics.opentargets.org/variant/${ chrom }_${ pos }_${ ref }_${ alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Open Target Genetics, a public-private partnership between Bristol Myers Squibb, GlaxoSmithKlein, Sanofi, and EMBL-EBI to allow browsing of genes, variants, and traits"
              >
                Open Targets Genetics <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`https://www.ebi.ac.uk/gwas/search?query=${ rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="The NHGRI-EBI Catalog of published genome-wide association studies, providing an updated and professionally curated database of published GWAS."
              >
                GWAS Catalog <span class="fa fa-external-link-alt" /></a>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div
      ref="eqtl-table"
      class="padtop"
    >
      <h2>eQTLs</h2>
      <tabulator-table
        :columns="table_base_columns"
        :table_data="table_data"
        :sort="table_sort"
        :tooltips="tabulator_tooltip_maker"
        tooltip-generation-mode="hover"
        :tooltips-header="true"
      />
    </div>
  </div>
</template>
