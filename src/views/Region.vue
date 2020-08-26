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
        LzPlot,
        SearchBox,
        SelectAnchors,
        TabulatorTable,
    },
    data() {
        return {
            // Data from the api (describes the variant)
            region_data: {},

            // Data that controls the view (user-selected options)
            chrom: null,
            start: null,
            end: null,

            // Fields whose values affect options and/or URL query params
            y_field: null,
            gene_id: null,
            tissue: null,

            extra_genes: [],
            extra_tissues: [],

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
            const { chrom, start, end, gene_id, tissue, y_field, extra_genes, extra_tissues } = this;

            const options = { chrom, start, end, gene_id, tissue, y_field };

            if (extra_genes.length) {
                options.extra_genes = extra_genes;
            }

            if (extra_tissues.length) {
                options.extra_tissues = extra_tissues;
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
            const { gene_id } = this;
            return `/api/data/gene/${gene_id}/`;
        },
    },
    watch: {
        y_field() {
            // This param might be set when the page first loads, but the associated function
            //   requires a reference to the plot. `nextTick` says "don't fire this watcher
            //   until after the plot has been created"
            if (!this.assoc_plot) {
                return;
            }

            this.$nextTick(() => switchY_region(this.assoc_plot, this.y_field));
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
        }).catch(() => next({ name: 'error' }));
    },
    methods: {
        changeAnchors(tissue, gene_id) {
            const { chrom, start, end } = this;
            this.$router.push({
                name: 'region',
                query: { chrom, start, end, gene_id, tissue },
            });
        },
        setQuery(params = {}) {
            // Set some default query params
            this.y_field = params.y_field || 'log_pvalue';
            // Our url serializer (`$.param`) serializes array params as `key[]`; convert to `key` format
            const { 'extra_genes[]': extra_genes, 'extra_tissues[]': extra_tissues } = params;
            if (extra_genes) {
                this.extra_genes = Array.isArray(extra_genes) ? extra_genes : [extra_genes];
            } else {
                this.extra_genes = [];
            }
            if (extra_tissues) {
                this.extra_tissues = Array.isArray(extra_tissues) ? extra_tissues : [extra_tissues];
            } else {
                this.extra_tissues = [];
            }
        },
        setData(data) {
            // Convert passed params to instance variables. Also create plot and do other reactive things.
            this.region_data = data;

            if (data) {
                const { chrom: chr, start, end, gene_id, tissue, symbol } = data;
                const { y_field } = this;
                const initialState = { chr, start, end, y_field };
                this.chrom = chr;
                this.start = start;
                this.end = end;
                this.gene_id = gene_id;
                this.tissue = tissue;

                // Create track layouts for the basic (anchor) track, plus any extra ones to be added to the plot
                const gene_tracks = this.extra_genes.slice()
                    .map((item) => getTrackLayout(item, tissue, initialState, data.gene_list[item]))
                    .flat();
                const tissue_tracks = this.extra_tissues.slice()
                    .map((item) => getTrackLayout(gene_id, item, initialState, symbol))
                    .flat();
                const track_panels = [
                    ...getTrackLayout(gene_id, tissue, initialState, symbol),
                    ...gene_tracks,
                    ...tissue_tracks,
                ];
                this.base_plot_layout = getBasicLayout(initialState, track_panels);

                // Create data sources for the basic (anchor) track, plus any extra ones to be added to the plot
                const gene_sources = this.extra_genes.slice()
                    .map((item) => getTrackSources(item, tissue))
                    .flat();
                const tissue_sources = this.extra_tissues.slice()
                    .map((item) => getTrackSources(gene_id, item))
                    .flat();
                const track_sources = [
                    ...getTrackSources(gene_id, tissue), // Plot the anchor gene and tissue first
                    ...gene_sources, // ...then any extra tracks relative to those anchors
                    ...tissue_sources,
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
        changePlotRegion({ chr, start, end }) {
            this.chrom = chr;
            this.start = start;
            this.end = end;
        },

        /**
     * Add a new gene or tissue track to the plot, after the plot has been created
     */
        addTrack(type, track_id) {
            if (type === 'gene') {
                const { gene_list } = this.region_data;
                let extra_gene_symbol;
                if (!track_id || !gene_list) {
                    extra_gene_symbol = null;
                } else {
                    extra_gene_symbol = gene_list[track_id];
                }
                addTrack(this.assoc_plot, this.assoc_sources, track_id, this.tissue, extra_gene_symbol);
                this.extra_genes.push(track_id);
            } else if (type === 'tissue') {
                addTrack(this.assoc_plot, this.assoc_sources, this.gene_id, track_id, this.region_data.symbol);
                this.extra_tissues.push(track_id);
            } else {
                throw new Error('Unrecognized type of track');
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
            <i>{{ region_data.symbol }}</i> (chr{{ chrom }}:{{ start.toLocaleString() }}-{{ end.toLocaleString() }})
          </strong>
        </h1>
      </div>
    </div>

    <div class="row justify-content-start">
      <div class="col-sm-12">
        <b-dropdown
          class="m-2"
          size="sm"
        >
          <template v-slot:button-content>
            <span
              v-b-tooltip.top.html
              class="fa fa-info-circle"
              title="Choose a new <b>anchor tissue</b> or <b>gene</b>. All other added plots will be based on these anchors: when you add a <b>new gene</b>, the eQTLs plotted will be between that gene and the <b>anchor tissue</b>; when you add a <b>new tissue</b>, the eQTLs plotted will be between that tissue and the <b>anchor gene</b>. <br><br>Changing either anchor will delete all other plots and generate a single new plot, with eQTLs for the anchor gene in the anchor tissue."
            >
              <span class="sr-only">Info</span>
            </span>
            Select anchors
          </template>
          <select-anchors
            class="px-3"
            :current_gene="gene_id"
            :current_tissue="tissue"
            :gene_list="region_data.gene_list"
            :tissue_list="region_data.tissue_list"
            @navigate="changeAnchors"
          />
        </b-dropdown>

        <b-dropdown
          class="m-2"
          size="sm"
        >
          <template v-slot:button-content>
            <span
              v-b-tooltip.top.html
              class="fa fa-info-circle"
              title="Add an additional track using a <b>new tissue or gene</b>.<br><br>If you add a <b>tissue</b>, the new track will show eQTLs between that tissue and the <b>anchor gene</b>.<br><br>If you add a <b>gene</b>, the new track will show eQTLs between that gene and the <b>anchor tissue</b>."
            >
              <span class="sr-only">Info</span>
            </span>
            Add tracks
          </template>
          <b-dropdown-text>
            <label>Add a gene
              <select
                class="form-control"
                @change="addTrack('gene', $event.target.value)"
              >
                <option
                  disabled
                  selected
                  value=""
                >...</option>
                <option
                  v-for="(a_symbol, a_geneid) in region_data.gene_list"
                  :key="a_geneid"
                  :value="a_geneid"
                >{{ a_symbol }}</option>
              </select>
            </label> &times; {{ region_data.tissue }}<br>
            <b-dropdown-divider />
            <label>Add a tissue
              <select
                class="form-control"
                @change="addTrack('tissue', $event.target.value)"
              >
                <option
                  disabled
                  selected
                  value=""
                >...</option>
                <option
                  v-for="a_tissue in region_data.tissue_list"
                  :key="a_tissue"
                  :value="a_tissue"
                >{{ a_tissue }}</option>
              </select>
              &times; {{ region_data.symbol }}
            </label>
          </b-dropdown-text>
        </b-dropdown>

        <b-dropdown
          text="Y-axis"
          class="m-2"
          size="sm"
        >
          <b-dropdown-text>
            <label>
              <input
                id="show-log-pvalue"
                v-model="y_field"
                type="radio"
                name="y-options"
                value="log_pvalue"
              > -log<sub>10</sub> P
            </label>
            <label>
              <span class="nobreak"><input
                id="show-beta"
                v-model="y_field"
                type="radio"
                name="y-options"
                value="beta"
              > Effect size <span
                id="y-axis-radio-effectsize"
                class="fa fa-info-circle"
              /></span>
            </label>
            <b-popover target="y-axis-radio-effectsize">
              Displays Normalized Effect Sizes (NES) on the Y-axis. See <a href="https://www.gtexportal.org/home/documentationPage">the GTEx Portal</a> for an explanation of NES.
            </b-popover>
            <label>
              <span class="nobreak"><input
                id="show-pip"
                v-model="y_field"
                type="radio"
                name="y-options"
                value="pip"
              > PIP <span
                id="y-axis-radio-pip"
                class="fa fa-info-circle"
              /></span>
            </label>
            <b-popover target="y-axis-radio-pip">
              Displays <a
                href="https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006646"
                target="_blank"
              >DAP-G</a> Posterior Inclusion Probabilities (PIP) on the Y-axis.<br>Cluster 1 denotes the cluster of variants (in LD with each other) with the strongest signal; cluster 2 denotes the set of variants with the next strongest signal; and so on.
            </b-popover>
          </b-dropdown-text>
        </b-dropdown>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <lz-plot
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
        class="col-sm-12 padtop"
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
              :href="`https://gtexportal.org/home/gene/${ region_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Detailed information from the GTEx Portal, including both gene and exon expression, along with single-tissue eQTLs and sQTLs."
            >
              GTEx Portal <span class="fa fa-external-link-alt" /> </a>
            <a
              v-b-tooltip.top
              :href="`https://gnomad.broadinstitute.org/gene/${ region_data.symbol }?dataset=gnomad_r3`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes"
            >
              gnomAD <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://pheweb.sph.umich.edu/gene/${ region_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative"
            >
              MGI <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/gene/${ region_data.symbol }`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software"
            >
              UKB-SAIGE <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://big.stats.ox.ac.uk/gene/${region_data.symbol}`"
              target="_blank"
              class="btn btn-secondary btn-sm mr-1"
              role="button"
              aria-pressed="true"
              title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software"
            >
              UKB-Oxford BIG <span class="fa fa-external-link-alt" /></a>
            <a
              v-b-tooltip.top
              :href="`http://www.ebi.ac.uk/gxa/search?geneQuery=[{'value':'${region_data.symbol}'}]`"
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
              :href="`https://www.ebi.ac.uk/gwas/genes/${region_data.symbol}`"
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
      class="padtop"
    >
      <h2>Significant eQTLs in <i>{{ region_data.symbol }}</i></h2>
      <tabulator-table
        :columns="table_base_columns"
        :ajax-u-r-l="gene_data_url"
        :sort="[{column:'pip', dir:'desc'},]"
        :tooltips="tabulator_tooltip_maker"
        tooltip-generation-mode="hover"
        :tooltips-header="true"
      />
    </div>
  </div>
</template>
