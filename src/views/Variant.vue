<script>
/**
 * Single-variant view: PheWAS plot with interactive display options
 */
import $ from 'jquery';
import '@/lz-helpers';
import {deNamespace, handleErrors, tabulator_tooltip_maker} from '@/util/common';

import LzPlot from '@/components/LzPlot.vue';
import SearchBox from '@/components/SearchBox.vue';
import TabulatorTable from '@/components/TabulatorTable.vue';
import {
    getPlotLayout,
    getPlotSources,
    groupByThing,
    setLabelCount,
    switchY,
    get_variant_table_config,
} from '@/util/variant-helpers';

function getData(variant) {
    return fetch(`/api/views/variant/${variant}/`)
        .then(handleErrors)
        .then((resp) => resp.json())
        // FIXME: More nuanced errors
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
            // Data sent from the api when the page is first loaded (basic info needed for the view).
            // The default values here will be overridden in almost any usage, but they exist to help define the expected contract between page and API.
            api_data: {
                chrom: '',
                pos: null,
                ref: '',
                alt: '',
                variant_id: '',
                top_gene: '',
                top_tissue: '',
                top_study: '',
                study_names: [],
                rsid: null,
                nearest_genes: [],
                is_inside_gene: null,
            },

            // Params that control the route: at the moment there are two phewas views (one for eQTL and one for sQTLs). This may change over time,
            // This is a parameter to a specific API endpoint used by this page.
            // 'ge' = gene expression (/variant/eqtl/_)
            // 'txrev' = Txrevise spliceQTL data (/variant/sqtl/_)
            data_type: 'ge',
            display_type: 'eQTL', // Human readable description of the data type

            // Params that control the view (user-selected options). These are serialized as query params to create persistent links.
            study: [], // List of all currently selected studies (may be none, or multiple; default to "show all")
            y_field: null,  // Field to show on plot y-axis
            group_by: null, // how to group results on plot x-axis
            n_labels: null, // How many item labels to show
            tss_distance: null, // How far away can a variant be from the TSS for its nearest gene?
            tss_position: null, // actual chromosomal position of the TSS for that gene

            // Calculated from options; controls plot display
            base_plot_sources: null,
            base_plot_layout: null,

            // Internal data passed between widgets
            table_data: [],

            // Internal state
            loading_done: false,
        };
    },
    computed: {
        pos_start() {
            return Math.max(this.api_data.pos - this.tss_distance, 1);
        },
        pos_end() {
            return this.api_data.pos + this.tss_distance;
        },
        table_sort() {
            // Update how tabulator is drawn, whenever y_field changes
            return [{ column: this.y_field, dir: 'desc' }];
        },
        query_params() {
            // Re-calculate the URL query string whenever dependent information changes.
            const { group_by, n_labels, study, tss_distance, y_field } = this;
            return $.param({ group_by, n_labels, study, tss_distance, y_field });
        },
        all_options() {
            // Sometimes (eg pageload), we change multiple options, but only want to re-render LZ once
            // This can be done by watching a synthetic compound property.
            // The value doesn't matter, only that it is different every time this runs
            // eslint-disable-next-line no-unused-vars
            const { group_by, n_labels, study, tss_distance, y_field } = this;
            return Date.now();
        },
        table_config() {
            return get_variant_table_config(this.data_type);
        },
    },
    watch: {
        group_by() {
            // Clear "same match" highlighting when re-rendering.
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => {
                groupByThing(this.$refs.phewas_plot.plot.layout, this.group_by);
            });
        },
        y_field() {
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => switchY(this.$refs.phewas_plot.plot.layout, this.y_field));
        },
        n_labels() {
            if (!this.$refs.phewas_plot) {
                return;
            }
            this.$nextTick(() => {
                setLabelCount(this.$refs.phewas_plot.plot.layout, this.n_labels);
            });
        },
        all_options() {
            // Sometimes, an action will change more than one option (especially happens on first page
            //  load, as we sync the plot with query params)
            // A synthetic watcher lets us re-render the plot only once total, no matter how many options
            //  are changed. Not all the watched variables are *used*, but it triggers dependency tracking.
            this.$nextTick(() => {
                // eslint-disable-next-line no-unused-vars
                const { group_by, n_labels, study, tss_distance, y_field } = this;

                if (!this.$refs.phewas_plot) {
                    return;
                }
                this.$refs.phewas_plot.callPlot((plot) =>
                    plot.applyState({
                        lz_match_value: null,
                        fivex_studies: study,
                        maximum_tss_distance: tss_distance,
                        minimum_tss_distance: -tss_distance,
                        start: this.pos_start,
                        end: this.pos_end,
                        y_field,
                    }),
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
        this.tabulator_tooltip_maker = tabulator_tooltip_maker;
    },
    beforeRouteEnter(to, from, next) {
        // First navigation to route
        let {display_type} = to.params;
        let data_type;
        // Convert UI names (eqtl, sqtl) to Alan's notation (ge, txrev) used internally by all api endpoints and layouts.
        //   This is a variable rename only influenced by the route initially loaded.
        if (display_type === 'eqtl') {
            data_type = 'ge';
        } else if (display_type === 'sqtl') {
            data_type = 'txrev';
        } else {
            throw new Error('Single-variant view supports only "eqtl" or "sqtl" options');
        }
        // For actual display on the page, we capitalize all but the first letter. This assumes we have eQTL and sQTL data, only.
        display_type = `${display_type[0]}QTL`;

        getData(to.params.variant, data_type)
            .then((api_data) => {
                next((vm) => {
                    vm.data_type = data_type;
                    vm.display_type = display_type;
                    vm.setQuery(to.query);
                    vm.setData(api_data);
                });
                // FIXME: More granular error handling
            }).catch((err) => next({ name: 'error' }));
    },
    beforeRouteUpdate(to, from, next) {
        // When going from one variant page to another (component is reused, only variable part of route changes)
        this.reset();

        // First navigation to route FIXME: DEDUP route enter/update logic (validation of get data type)
        let {display_type} = to.params;
        let data_type;
        // Convert UI names (eqtl, sqtl) to Alan's notation (ge, txrev) used internally by all api endpoints and layouts.
        //   This is a variable rename only influenced by the route initially loaded.
        if (display_type === 'eqtl') {
            data_type = 'ge';
        } else if (display_type === 'sqtl') {
            data_type = 'txrev';
        } else {
            throw new Error('Single-variant view supports only "eqtl" or "sqtl" options');
        }
        // For actual display on the page, we capitalize all but the first letter. This assumes we have eQTL and sQTL data, only.
        display_type = `${display_type[0]}QTL`;


        getData(to.params.variant).then((data) => {
            this.display_type = display_type;
            this.data_type = data_type;

            this.setQuery(to.query);
            this.setData(data);
            next();
            // FIXME: More granular error handling
        }).catch((err) => next({ name: 'error' }));
    },
    methods: {
        setQuery(params = {}) {
            // Set initial display based on the URL query string, or defaults, as appropriate
            const { group_by, n_labels, tss_distance, y_field } = params;

            // Convert jquery $.param format to that used internally in this page
            //   Rename array params `key[]` -> `key`, and ensure that items are arrays, not single strings
            const { 'study[]': study } = params;
            if (study) {
                this.study = Array.isArray(study) ? study : [study];
            } else {
                this.study = [];
            }
            this.group_by = group_by || 'symbol';
            this.n_labels = +n_labels || 5;
            this.tss_distance = +tss_distance || 200000;
            this.y_field = y_field || 'log_pvalue';
        },
        setData(api_data) {
            this.api_data = api_data;
            if (api_data) {
                //  When the page is first loaded, create the plot instance
                if (!this.study.length) {
                    // One of our URL query params cannot be set until after the data is fetched: default to "show all studies"
                    this.study = api_data.study_names;
                }
                const layout = getPlotLayout(
                    this.api_data.chrom,
                    this.api_data.pos,
                    {
                        variant: api_data.variant,
                        position: api_data.pos,
                        chr: api_data.chrom,
                        start: this.pos_start,
                        end: this.pos_end,
                        fivex_studies: this.study,
                        minimum_tss_distance: -this.tss_distance,
                        maximum_tss_distance: this.tss_distance,
                        y_field: this.y_field,
                    },
                );
                // Apply query param defaults to layout
                groupByThing(layout, this.group_by);
                switchY(layout, this.y_field);
                setLabelCount(layout, this.n_labels);

                this.base_plot_layout = layout;
                this.base_plot_sources = getPlotSources(this.api_data.chrom, this.api_data.pos, this.data_type);
            }

            // If used in reset mode, set loading to true
            this.loading_done = !!api_data;
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
            this.$refs.phewas_plot.callPlot((plot) =>
                plot.subscribeToData(
                    [
                        'phewas:log_pvalue', 'phewas:gene_id', 'phewas:transcript', 'phewas:tissue', 'phewas:system', 'phewas:study',
                        'phewas:symbol', 'phewas:beta', 'phewas:stderr_beta', 'phewas:pip', 'phewas:txrevise_event',
                        'phewas:cs_index', 'phewas:cs_size', 'phewas:chromosome', 'phewas:rsid',
                    ],
                    (data) => {
                        // Data sent from locuszoom contains a prefix (phewas:). We'll remove that prefix before
                        // using it in tabulator, so that tabulator layouts can be written that also work with
                        // data directly from the API (where there is no prefix)
                        this.table_data = data.map((item) => deNamespace(item));
                    },
                ),
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
    class="container-fluid"
  >
    <b-navbar
      class="py-0"
      type="light"
      variant="white"
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
          {{ display_type }} Table <span class="fas fa-level-down-alt" />
        </b-button>
        <b-navbar-nav class="ml-auto">
          <search-box class="searchbox" />
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <div
      ref="single-variant-eqtl-plot"
      class="row pt-md-4"
    >
      <div class="col-sm-12">
        <h1>
          <strong>
            cis-{{ display_type }}s associated with variant: {{ api_data.rsid }} <span class="text-muted"><small>({{ api_data.variant_id }})</small></span>
          </strong>
        </h1>
      </div>
    </div>
    <div class="row justify-content-start">
      <div class="col-sm-12">
        <router-link
          class="btn btn-sm btn-primary m-2 rounded-pill"
          :to="{name: 'variant', params: {display_type: display_type === 'eQTL' ? 'sqtl' : 'eqtl', variant: `${api_data.chrom}_${api_data.pos}`}}"
        >
          Switch to {{ display_type === 'eQTL' ? 'sQTL' : 'eQTL' }}s
        </router-link>

        <b-dropdown
          text="X-Axis Group"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-form style="width: 180px;">
            <b-form-radio-group
              v-model="group_by"
              :options="[
                { value: 'study', text: 'Study' },
                { value: 'studytissue', text: 'Study & Tissue' },
                { value: 'system', text: 'System' },
                { value: 'symbol', text: 'Gene' }
              ]"
              name="group-options"
              stacked
            />
          </b-dropdown-form>
        </b-dropdown>

        <b-dropdown
          text="Y-Axis"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-text>
            Change value on y-axis
          </b-dropdown-text>
          <b-dropdown-form style="width: 220px;">
            <b-form-radio-group
              v-model="y_field"
              :options="[
                { value: 'log_pvalue', html: '-log<sub>10</sub> P' },
                { value: 'beta', text: 'Effect size (NES)' },
                { value: 'pip', text: 'PIP (SuSiE)' }
              ]"
              name="y-options"
              stacked
            />
          </b-dropdown-form>
        </b-dropdown>

        <b-dropdown
          text="Labels"
          class="mr-2"
          size="sm"
        >
          <b-dropdown-item>
            <!-- FIXME: Why is the significance threshold different? How was this threshold chosen? -->
            Label hits with p &lt; 10<sup>-10</sup> (or p &lt; 10<sup>-20</sup> if effect sizes are viewed)
          </b-dropdown-item>
          <b-dropdown-form>
            <b-form-radio-group
              v-model="n_labels"
              :options="[{ value: 0, text: 'No labels' }, { value: 5, text: 'Top 5' }, { value: 20, text: 'Top 20' }]"
              name="label-options"
              stacked
            />
          </b-dropdown-form>
        </b-dropdown>

        <b-dropdown
          class="mr-2"
          size="sm"
          text="Max TSS dist. (bp)"
        >
          <b-dropdown-item>
            Distance from variant to nearest gene
          </b-dropdown-item>
          <b-dropdown-form>
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
              stacked
            />
          </b-dropdown-form>
        </b-dropdown>

        <b-dropdown
          class="m-2"
          size="sm"
          text="Choose study"
        >
          <b-dropdown-text>
            click to select a single study<br>
            ctrl-click to add/remove individual studies<br>
            ctrl-a to select all studies
          </b-dropdown-text>
          <b-dropdown-form
            style="width: 22rem;"
          >
            <b-form-select
              v-model="study"
              name="study-selector"
              multiple
              :options="api_data.study_names"
              :select-size="10"
            />
          </b-dropdown-form>
        </b-dropdown>
      </div>
    </div>

    <lz-plot
      ref="phewas_plot"
      :base_layout="base_plot_layout"
      :base_sources="base_plot_sources"
      :chr="api_data.chrom"
      :start="pos_start"
      :end="pos_end"
      @connected="onPlotConnected"
    />

    <div
      ref="genotype-infobox"
      class="row pt-md-3"
    >
      <div class="col-sm-12">
        <h2>Variant Information from Sequence Genotype </h2>
        <div class="card-group">
          <div class="card variant-information-grouped-card">
            <div class="card-body">
              <dl class="variant-info-middle">
                <template v-if="api_data.top_gene !== null">
                  <dt>Top gene (PIP)</dt>
                  <dd><i>{{ api_data.top_gene_symbol }} ({{ api_data.top_gene }})</i></dd>
                </template>
                <template v-if="api_data.top_tissue !== null">
                  <dt>Top tissue</dt>
                  <dd>{{ api_data.top_tissue }}</dd>
                </template>
                <template v-if="api_data.top_study !== null">
                  <dt>Top study</dt>
                  <dd>{{ api_data.top_study }}</dd>
                </template>
              </dl>
            </div>
          </div>

          <div class="card variant-information-grouped-card">
            <div class="card-body">
              <dl class="variant-information-dl">
                <template v-if="api_data.rsid !== null">
                  <dt>rsid</dt>
                  <dd>{{ api_data.rsid }}</dd>
                </template>
                <dt>{{ api_data.is_inside_gene ? "Overlapping" : "Nearest" }} gene(s)</dt>
                <dd>
                  <i>
                    <span
                      v-for="(gene, index) in api_data.nearest_genes"
                      :key="gene.ensg"
                      class="text-with-definition"
                      :title="gene.ensg"
                    >
                      {{ gene.symbol }}<span v-if="api_data.nearest_genes && index === api_data.nearest_genes.length">,</span>
                    </span>
                    <span v-if="!api_data.nearest_genes || !api_data.nearest_genes.length">(no genes found)</span>
                  </i>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            External links:
            <template v-if="api_data.ref!==null && api_data.alt !== null">
              <a
                v-b-tooltip.top.html
                :href="`https://bravo.sph.umich.edu/freeze5/hg38/variant/${ api_data.chrom }-${ api_data.pos }-${ api_data.ref }-${ api_data.alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Variant data from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>"
              >
                BRAVO <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`https://gtexportal.org/home/snp/chr${ api_data.chrom }_${ api_data.pos }_${ api_data.ref }_${ api_data.alt }_b38`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Variant data from the Genotype-Tissue Expression project, containing expression data, histology images, and in-depth expression data analysis"
              >
                GTEx Portal <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr${ api_data.chrom }%3A${ api_data.pos }-${ api_data.pos }&position=chr${ api_data.chrom }%3A${ api_data.pos - 25 }-${ api_data.pos + 25 }`"
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
                :href="`https://gnomad.broadinstitute.org/variant/chr${ api_data.chrom }-${ api_data.pos }-${ api_data.ref }-${ api_data.alt }?dataset=gnomad_r3`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes"
              >
                gnomAD <span class="fa fa-external-link-alt" /></a>
            </template>
            <template v-if="api_data.rsid !==null">
              <a
                v-b-tooltip.top
                :href="`https://www.ncbi.nlm.nih.gov/snp/${ api_data.rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Reference SNP Report from the National Center for Biotechnology Information (NCBI)"
              > dbSNP
                <span class="fa fa-external-link-alt" /> </a>
              <a
                v-b-tooltip.top
                :href="`http://pheweb.sph.umich.edu/go?query=${ api_data.rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative"
              >
                MGI-PheWeb <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`https://pheweb.org/UKB-TOPMed/variant/${ api_data.chrom }-${ api_data.pos }-${ api_data.ref }-${ api_data.alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="PheWeb summary association results between 57 million TOPMed-imputed variants and 1,400 electronic health record-derived phenotypes from the UK Biobank, with up to ~78k cases and ~409k controls"
              >
                UKB-PheWeb <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`http://big.stats.ox.ac.uk/go?query=${ api_data.rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software"
              >
                UKB-Oxford <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`https://genetics.opentargets.org/variant/${ api_data.chrom }_${ api_data.pos }_${ api_data.ref }_${ api_data.alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Open Targets Genetics, a public-private partnership between Bristol Myers Squibb, GlaxoSmithKlein, Sanofi, and EMBL-EBI to allow browsing of genes, variants, and traits"
              >
                Open Targets <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`https://www.ebi.ac.uk/gwas/search?query=${ api_data.rsid }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="The NHGRI-EBI Catalog of published genome-wide association studies, providing an updated and professionally curated database of published GWAS."
              >
                GWAS Catalog <span class="fa fa-external-link-alt" /></a>
              <a
                v-b-tooltip.top
                :href="`http://r5.finngen.fi/variant/${ api_data.chrom }-${ api_data.pos }-${ api_data.ref }-${ api_data.alt }`"
                target="_blank"
                class="btn btn-secondary btn-sm mr-1"
                role="button"
                aria-pressed="true"
                title="Data freeze 5 of the FinnGen study, a public-private partnership with genetic association data for 2,803 disease endpoints from 218,792 individuals, with data from Finnish biobanks and digital health record data from Finnish health registries"
              >
                FinnGEN-PheWeb <span class="fa fa-external-link-alt" /></a>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div
      ref="eqtl-table"
      class="pt-md-3"
    >
      <h2>{{ display_type }}s</h2>
      <tabulator-table
        v-if="table_config"
        :columns="table_config"
        :table_data="table_data"
        :height="'600px'"
        :sort="table_sort"
        :tooltips="tabulator_tooltip_maker"
        tooltip-generation-mode="hover"
        :tooltips-header="true"
      />
    </div>
  </div>
</template>
