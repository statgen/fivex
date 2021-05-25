<script>
import $ from 'jquery';
import '@/lz-helpers';
import { handleErrors } from '@/util/common';

import LzPlot from '@/components/LzPlot.vue';
import SearchBox from '@/components/SearchBox.vue';
import SelectAnchors from '@/components/SelectAnchors.vue';
import TabulatorTable from '@/components/TabulatorTable.vue';

import {
    addTrack,
    getBasicLayout,
    getBasicSources,
    getTrackLayout,
    getTrackSources,
    switchY_region,
} from '@/util/region-helpers';

import { REGION_TABLE_BASE_COLUMNS, tabulator_tooltip_maker } from '@/util/variant-helpers';
import AddTrack from '@/components/AddTrack';

/**
 * Get the data required to render the template
 * @param {Object} queryParams
 */
function getData(queryParams) {
    // FIXME: Our Vue page has some special options (like y_field) that don't matter to the API
    //  but currently get passed anyway. That's mildly silly and will break if Vue and the API use
    //  the same parameter to mean different things.
    const params = $.param(queryParams);
    return fetch(`/api/views/region/?${params}`)
        .then(handleErrors)
        .then((resp) => resp.json());
}

export default {
    name: 'RegionView',
    components: {
        AddTrack,
        LzPlot,
        SearchBox,
        SelectAnchors,
        TabulatorTable,
    },
    data() {
        return {
            // Data sent from the api when the page is first loaded (basic info needed for the view).
            // The default values here will be overridden in almost any usage, but they exist to help define the expected contract between page and API.
            // Some of these fields can be set by either the page query params ("what tracks should we show")
            //  or else filled in by the API ("if nothing requested, show something interesting")
            api_data: {
                chrom: '',
                start: null,
                end: null,
                center: null,
                gene_id: '',
                study: '',
                tissue: '',
                symbol: '',
                tissue_list: [],
                tissues_per_study: {},
                gene_list: [],
            },

            // Data that controls the view (user-selected options that may change while in the page)
            chrom: null,
            start: null,
            end: null,

            // Fields whose values affect options and/or URL query params
            y_field: null,
            gene_id: null,
            tissue: null,
            study: null,

            extra_tracks: [],

            // Internal data passed between widgets
            table_data: [],

            // Internal state
            base_plot_sources: null,
            base_plot_layout: null,
            loading_done: false,
        };
    },
    computed: {
        short_gene_id() {
            // Strip versions from ENSG identifiers for display (ENSG0.1 -> ENSG0)
            const { gene_id } = this;
            return gene_id && gene_id.split('.')[0];
        },

        query_params() {
            // Re-calculate the URL query string whenever dependent information changes.
            const { chrom, start, end, gene_id, tissue, study, y_field, extra_tracks } = this;

            const options = { chrom, start, end, gene_id, tissue, study, y_field };

            if (extra_tracks.length) {
                options.extra_tracks = extra_tracks;
            }
            return $.param(options);
        },

        table_sort() {
            // Update how tabulator is drawn, whenever y_field changes
            return [{ column: this.y_field, dir: 'desc' }];
        },

        gene_data_url() {
            // Re-calculate URL to retrieve all variants when chrom, start, and/or end changes.
            // Add the option "?piponly=True" to the end of the url to return only points
            // with non-missing PIP values, i.e. only points that are found in the DAP-G database
            // const { chrom, start, end } = this;
            // return `/api/data/region/${chrom}/${start}-${end}/?piponly=True`;
            // const { gene_id } = this;
            // return `/api/data/gene/${gene_id}/`;
            const { chrom, start, end } = this;
            return `/api/data/cs/${chrom}/${start}-${end}/`;
        },

        tissues_per_study() {
            // Reformat the API tissues-per-study information to work with bootstrap-vue select boxes
            const { tissues_per_study } = this.api_data;
            // Backend sends { [study_name]: list_of_tissues }
            const choices = [];
            Object.entries(tissues_per_study).forEach(([study_name, tissue_list]) => {
                choices.push({
                    label: study_name,
                    options: tissue_list.map((tissue_name) => ({text: tissue_name, value: {study_name, tissue_name}})),
                });
            });
            return choices;
        },
    },
    watch: {
        y_field() {
            // This param might be set when the page first loads, but the associated function
            //   requires a reference to the plot. `nextTick` says "don't fire this watcher
            //   until after the plot has been created"
            this.$nextTick(() => {
                if (!this.assoc_plot) {
                    return;
                }
                switchY_region(this.assoc_plot.layout, this.y_field);
                this.assoc_plot.applyState();
            });
        },

        query_params() {
            // Update the URL so that it always reflects the current view- change when the query params
            //  would change. (including at first page load, if the server, eg, auto-suggests a best
            //  gene/tissue for region)

            // We're very intentionally bypassing the Vue router functions here. Those would trigger
            //   a full page reload whenever params change, but we want to do incremental things
            //   (like adding plot panels) that would not benefit from a reload.
            window.history.replaceState({}, document.title, `?${this.query_params}`);
        },
    },

    beforeCreate() {
        // See: https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-before-navigation
        // Preserve a reference to component widgets so that their methods can be accessed directly
        //  Some- esp LZ plots- behave very oddly when wrapped as a nested observable; we can
        //  bypass these problems by assigning them as static properties instead of nested
        //  observables.
        this.assoc_plot = null;
        this.assoc_sources = null;

        // Make some constants available to the Vue instance for use as props in rendering
        this.table_base_columns = REGION_TABLE_BASE_COLUMNS;
        this.tabulator_tooltip_maker = tabulator_tooltip_maker;
    },

    beforeRouteEnter(to, from, next) {
        // Fires on first navigation to route (from another route)
        getData(to.query)
            .then((data) => {
                next((vm) => {
                    vm.setQuery(to.query);
                    vm.setData(data);
                });
                // FIXME: more nuanced errors
            }).catch(() => next({ name: 'error' }));
    },

    beforeRouteUpdate(to, from, next) {
        // When going from one Region page to another (component is reused, only variable part of route changes)

        // Reset internal state (because we're reusing the same component)
        this.setQuery();
        this.setData();
        this.assoc_plot = null;
        this.assoc_sources = null;

        getData(to.query).then((data) => {
            this.setQuery(to.query);
            this.setData(data);
            next();
            // FIXME: more nuanced errors
        }).catch(() => next({ name: 'error' }));
    },
    methods: {
        changeAnchors(study, tissue, gene_id) {
            const { chrom, start, end } = this;
            this.$router.push({
                name: 'region',
                query: { chrom, start, end, study, gene_id, tissue },
            });
        },

        setQuery(params = {}) {
            // Set some default query params
            this.y_field = params.y_field || 'log_pvalue';
            // Convert jquery $.param format to that used internally in this page
            //   Rename array params `key[]` -> `key`, and ensure that items are arrays, not single strings
            const { 'extra_tracks[]': extra_tracks } = params;
            if (extra_tracks) {
                this.extra_tracks = Array.isArray(extra_tracks) ? extra_tracks : [extra_tracks];
            } else {
                this.extra_tracks = [];
            }
        },
        setData(data) {
            // Convert passed params to instance variables. Also create plot and do other reactive things.
            this.api_data = data;

            if (data) {
                const { chrom: chr, start, end, gene_id, tissue, study, symbol } = data;
                const { extra_tracks, y_field } = this;
                const initialState = { chr, start, end, y_field };
                this.chrom = chr;
                this.start = start;
                this.end = end;
                this.gene_id = gene_id;
                this.tissue = tissue;
                this.study = study;

                // Create track layouts for the basic (anchor) track, plus any extra ones to be added to the plot
                //  In the URL, extra tracks are serialized as `gene_id$tissue_name`
                const track_identifiers = extra_tracks.map((item) => item.split('$'));  // list of [study_name, tissue_name, gene_id] triplets

                const track_layouts = track_identifiers
                    .map(([study_name, tissue_name, gene_id]) => {
                        const gene_name = data.gene_list[gene_id];
                        return getTrackLayout(gene_id, study_name, tissue_name, initialState, gene_name, this.y_field);
                    }).flat();

                // Anchor + extra tracks
                const track_panels = [
                    ...getTrackLayout(gene_id, study, tissue, initialState, symbol, this.y_field),
                    ...track_layouts,
                ];
                this.base_plot_layout = getBasicLayout(initialState, track_panels);

                const extra_sources = track_identifiers
                    .map(([study_name, tissue_name, gene_id]) => getTrackSources(gene_id, study_name, tissue_name))
                    .flat();

                // Create data sources for the basic (anchor) track, plus any extra ones to be added to the plot
                const track_sources = [
                    ...getTrackSources(gene_id, study, tissue), // Plot the anchor gene and tissue first
                    ...extra_sources,
                ];

                this.base_plot_sources = getBasicSources(track_sources);
            }
            this.loading_done = !!data;
        },

        receivePlot(plot, data_sources) {
            this.assoc_plot = plot;
            this.assoc_sources = data_sources;
        },

        /**
         * Update the page when the plot region is changed
         */
        changePlotRegion(lzEvent) {
            const { chr, start, end } = lzEvent.data;
            this.chrom = chr;
            this.start = start;
            this.end = end;
        },

        /**
         * Add a new gene or tissue track to the plot, after the plot has been created
         */
        addTrack(study_name, tissue_name, gene_id) {
            // FIXME: Known issue: "add tissue" mode has a bug where panel titles show gene id instead of name
            //   Root cause: anchor gene ID strips version IDs, so when tissue is added relative to anchor,
            //   Recommended fix: harmonize how we present gene IDs in the backend data store, rather than cleaning it up
            //   in many places throughout the app
            const { gene_list } = this.api_data;
            const gene_symbol = gene_list[gene_id];
            const key = `${study_name}$${tissue_name}$${gene_id}`;

            if (!this.extra_tracks.includes(key)) {
                addTrack(this.assoc_plot, this.assoc_sources, gene_id, tissue_name, study_name, gene_symbol, this.y_field);
                this.extra_tracks.push(key);
            }
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
    <div class="d-flex justify-content-center align-items-center">
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
          @click="goto('region-plot')"
        >
          Plot <span class="fas fa-level-down-alt" />
        </b-button>
        <b-button
          class="mr-2 btn-light btn-link"
          size="sm"
          @click="goto('external-links')"
        >
          External links <span class="fas fa-level-down-alt" />
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
    <div class="row">
      <div
        ref="region-plot"
        class="col-sm-12"
      >
        <h1 style="margin-top: 1em;">
          <strong>Single-tissue eQTLs near
            <i>{{ api_data.symbol }}</i> <span class="text-muted"><small>(chr{{ chrom }}:{{ start.toLocaleString() }}-{{ end.toLocaleString() }})</small></span>
          </strong>
        </h1>
      </div>
    </div>

    <div class="row justify-content-start">
      <div class="col-sm-12">
        <b-dropdown
          class="m-2"
          size="sm"
          text="Choose reference Gene and Tissue"
        >
          <select-anchors
            class="px-3"
            :current_gene="gene_id"
            :current_study="study"
            :current_tissue="tissue"
            :gene_list="api_data.gene_list"
            :tissues_per_study="tissues_per_study"
            @navigate="changeAnchors"
          />
        </b-dropdown>

        <b-dropdown
          class="m-2"
          size="sm"
          text="Add plot"
          menu-class="adder-dropdown"
        >
          <b-dropdown-form @submit.prevent>
            <add-track
              :gene_list="api_data.gene_list"
              :tissues_per_study="tissues_per_study"
              :current_gene_symbol="api_data.symbol"
              :current_gene_id="gene_id"
              :current_study="study"
              :current_tissue="tissue"
              @add-track="addTrack"
            />
          </b-dropdown-form>
        </b-dropdown>

        <b-dropdown
          text="Y-axis"
          class="m-2"
          size="sm"
        >
          <b-dropdown-form style="width: 200px;">
            <b-radio-group
              v-model="y_field"
              name="y-options"
              :options="[
                { value: 'log_pvalue', html: '-log<sub>10</sub> P' },
                { value: 'beta', text: 'Effect size (NES)' },
                { value: 'pip', text: 'PIP (SuSiE)' }
              ]"
              stacked
            />
          </b-dropdown-form>
        </b-dropdown>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <lz-plot
          ref="region_plot"
          :base_layout="base_plot_layout"
          :base_sources="base_plot_sources"
          :chr="chrom"
          :start="start"
          :end="end"
          @region_changed="changePlotRegion"
          @connected="receivePlot"
        />
      </div>
    </div>

    <div class="row">
      <div
        ref="external-links"
        class="col-sm-12 pt-md-1"
      >
        <div class="card">
          <div class="card-body">
            External links:
            <a
              v-b-tooltip.top
              :href="`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr${ chrom }%3A${ start }-${ end }&highlight=hg38.chr${ chrom }%3A${ start }-${ end }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="The UC Santa Cruz Genome Browser"
            > UCSC <span
              class="fa fa-external-link-alt"
            /></a>
            <a
              v-b-tooltip.top.html
              :href="`https://bravo.sph.umich.edu/freeze5/hg38/gene/${ short_gene_id }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Gene information from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>"
            >
              BRAVO <span class="fa fa-external-link-alt" /> </a>
            <a
              v-b-tooltip.top.html
              :href="`https://gtexportal.org/home/gene/${ api_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Detailed information from the GTEx Portal, including both gene and exon expression, along with single-tissue eQTLs and sQTLs."
            >
              GTEx Portal <span class="fa fa-external-link-alt" /> </a>
            <a
              v-b-tooltip.top
              :href="`https://gnomad.broadinstitute.org/gene/${ api_data.symbol }?dataset=gnomad_r3`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes"
            >
              gnomAD <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://pheweb.sph.umich.edu/gene/${ api_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative"
            >
              MGI <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/gene/${ api_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software"
            >
              UKB-SAIGE <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://big.stats.ox.ac.uk/gene/${api_data.symbol}`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software"
            >
              UKB-Oxford BIG <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://www.ebi.ac.uk/gxa/search?geneQuery=[{'value':'${api_data.symbol}'}]`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="The Expression Atlas is a project from the European Bioinformatics Institute (EMBL-EBI), with results from over 3,000 experiments from 40 different organisms, which have been manually reviewed, curated, and standardized."
            >
              Expression Atlas <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`https://genetics.opentargets.org/gene/${short_gene_id}`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Open Target Genetics, a public-private partnership between Bristol Myers Squibb, GlaxoSmithKlein, Sanofi, and EMBL-EBI to allow browsing of genes, variants, and traits"
            >
              Open Target Genetics <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`https://www.ebi.ac.uk/gwas/genes/${api_data.symbol}`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="The NHGRI-EBI Catalog of published genome-wide association studies, providing an updated and professionally curated database of published GWAS."
            >
              GWAS Catalog <span class="fa fa-external-link-alt" /></a>
          </div>
        </div>
      </div>
    </div>
    <div
      ref="eqtl-table"
      class="pt-md-3"
    >
      <h2>Significant eQTLs near <i>{{ api_data.symbol }}</i></h2>
      <tabulator-table
        :columns="table_base_columns"
        :ajax-u-r-l="gene_data_url"
        :height="'600px'"
        :sort="[{column:'pip', dir:'desc'},]"
        :tooltips="tabulator_tooltip_maker"
        tooltip-generation-mode="hover"
        :tooltips-header="true"
      />
    </div>
  </div>
</template>

<style>
  .adder-dropdown {
      min-width: 350px;
  }
</style>
