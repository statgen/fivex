<script>
import $ from 'jquery';

import LocusZoom from 'locuszoom';
import '@/lz-helpers';
import { handleErrors, PORTALDEV_URL } from '@/util';

import LzPlot from '@/components/LzPlot.vue';
import SearchBox from '@/components/SearchBox.vue';
import SelectAnchors from '@/components/SelectAnchors.vue';

const MAX_EXTENT = 1000000;

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

/**
 * Get the datasources required for a single track
 * @param gene_id Full ENSG identifier (including version)
 * @param tissue The name of the associated tissue
 * @returns {Array[]} Array of configuration options for all required data sources
 */
function getTrackSources(gene_id, tissue) {
  const geneid_short = gene_id.split('.')[0];
  return [
    [`assoc_${tissue}_${geneid_short}`, ['assocGET', {
      url: '/api/data/region/',
      params: { gene_id, tissue },
    }]],
  ];
}

/**
 * Get the LocusZoom layout for a single track
 * @param {string} gene_id
 * @param {string} tissue
 * @param {object} state
 * @param {String} genesymbol
 * @returns {[*]}
 */
function getTrackLayout(gene_id, tissue, state, genesymbol) {
  // eslint-disable-next-line no-param-reassign
  genesymbol = genesymbol || gene_id;
  const geneid_short = gene_id.split('.')[0];

  const newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true }).tooltip;
  newscattertooltip.html = `${newscattertooltip.html.replace('Make LD Reference', 'Set this variant as index for LD')
  }<strong>Gene</strong>: <i>{{{{namespace[assoc]}}symbol}}</i> <br>
        <strong>MAF</strong>: {{{{namespace[assoc]}}maf}} <br>
        <strong>NES</strong>: {{{{namespace[assoc]}}beta}} <br>
        <strong>PIP</strong>: {{{{namespace[assoc]}}pip}} <br>
        <strong>SPIP</strong>: {{{{namespace[assoc]}}spip}} <br>
        <strong>PIP cluster</strong>: {{{{namespace[assoc]}}pip_cluster}} <br>
        <a href='/variant/{{{{namespace[assoc]}}chromosome}}_{{{{namespace[assoc]}}position}}/'>Go to single-variant view</a>`;

  const namespace = { assoc: `assoc_${tissue}_${geneid_short}` };
  const assoc_layer = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
    unnamespaced: true,
    fields: [
      '{{namespace[assoc]}}chromosome', '{{namespace[assoc]}}position',
      '{{namespace[assoc]}}ref_allele',
      '{{namespace[assoc]}}variant', '{{namespace[assoc]}}symbol',
      '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}beta',
      '{{namespace[assoc]}}stderr_beta', '{{namespace[assoc]}}maf',
      '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
      '{{namespace[assoc]}}pip', '{{namespace[assoc]}}pip|pip_yvalue',
      '{{namespace[assoc]}}spip', '{{namespace[assoc]}}pip_cluster',
    ],
    tooltip: newscattertooltip,
  });

  const layoutBase = LocusZoom.Layouts.get('panel', 'association', {
    id: `assoc_${tissue}_${geneid_short}`,
    title: { // Remove this when LocusZoom update with the fix to dashboard titles is published
      text: `${genesymbol} in ${tissue}`,
      x: 60,
      y: 30,
    },
    namespace,
    data_layers: [
      LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
      LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
      assoc_layer,
    ],
  });
  layoutBase.axes.y1.label_offset = 36;

  /* Add this back in when LocusZoom update is published
  layoutBase.dashboard.components.push(
      {
          type: 'title',
          title: `<i>${genesymbol}</i> in ${tissue}`,
          position: 'left'
      }
  );
  */

  return [layoutBase];
}

/**
 * Get the LocusZoom layout for a single-track plot, filling in options as needed
 * @param {object} initial_state
 * @param {Array[]} track_panels
 * @returns {Object}
 */
function getBasicLayout(initial_state = {}, track_panels = []) {
  const newgenestooltip = LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true }).tooltip;
  newgenestooltip.html += `<br> <a onclick="addTrack('{{gene_id}}', false)" href="javascript:void(0);">Add this gene</a>`;
  const gene_track = LocusZoom.Layouts.get('data_layer', 'genes', {
    unnamespaced: true,
    tooltip: newgenestooltip,
    exon_height: 8,
    bounding_box_padding: 5,
    track_vertical_spacing: 5,
    exon_label_spacing: 3,
  });

  const base_layout = LocusZoom.Layouts.get('plot', 'standard_association', {
    state: initial_state,
    max_region_scale: MAX_EXTENT,
    responsive_resize: 'width_only',
    dashboard: {
      components: [
        {
          color: 'gray',
          position: 'right',
          type: 'download',
        },
      ],
    },

    panels: [
      ...track_panels,
      LocusZoom.Layouts.get('panel', 'genes', { data_layers: [gene_track] }),
    ],
  });
  base_layout.dashboard.components.push(LocusZoom.Layouts.get('dashboard_components', 'ldlz2_pop_selector'));
  return base_layout;
}

/**
 * Get the default source configurations for a plot
 */
function getBasicSources(track_sources = []) {
  return [
    ...track_sources,
    ['ld', ['LDLZ2', {
      url: 'https://portaldev.sph.umich.edu/ld/',
      params: { source: '1000G', population: 'ALL', build: 'GRCh38' },
    }]],
    ['recomb', ['RecombLZ', {
      url: `${PORTALDEV_URL}annotation/recomb/results/`,
      params: { build: 'GRCh38' },
    }]],
    ['gene', ['GeneLZ', { url: `${PORTALDEV_URL}annotation/genes/`, params: { build: 'GRCh38' } }]],
    ['constraint', ['GeneConstraintLZ', {
      url: 'https://gnomad.broadinstitute.org/api',
      params: { build: 'GRCh38' },
    }]],
  ];
}

/**
 * Add the specified data to the plot
 * @param {LocusZoom.Plot} plot
 * @param {LocusZoom.DataSources} data_sources
 * @param {Object[]} panel_options
 * @param {Object[]} source_options
 */
function addPanels(plot, data_sources, panel_options, source_options) {
  source_options.forEach((source) => data_sources.add(...source));
  panel_options.forEach((panel_layout) => {
    panel_layout.y_index = -1; // Make sure genes track is always the last one
    const panel = plot.addPanel(panel_layout);
    panel.addBasicLoader();
  });
}

/**
 * Add a single new track to the plot
 * @param {LocusZoom.Plot} plot
 * @param {LocusZoom.DataSources} datasources
 * @param {string} gene_id
 * @param {string} tissue
 * @param {string} genesymbol
 */
function addTrack(plot, datasources, gene_id, tissue, genesymbol) {
  const track_layout = getTrackLayout(gene_id, tissue, plot.state, genesymbol);
  const track_sources = getTrackSources(gene_id, tissue);
  addPanels(plot, datasources, track_layout, track_sources);
}


/**
 * Switch the options used in displaying Y axis
 * @param {LocusZoom.Plot} plot
 * @param yfield Which field to use in plotting y-axis. Either 'log_pvalue', 'beta', or 'pip'
 */
function switchY_region(plot, yfield) {
  // Iterate through all panels, including any added panels
  Object.keys(plot.panels).forEach((panel_id) => {
    const panel = plot.panels[panel_id].layout;
    if (panel.data_layers.some((d) => d.id === 'associationpvalues') && panel.data_layers.some((d) => d.id === 'significance')) {
      const scatter_layout = panel.data_layers.find((d) => d.id === 'associationpvalues');
      const panel_base_y = scatter_layout.y_axis;
      const significance_line_layout = panel.data_layers.find((d) => d.id === 'significance');
      if (yfield === 'beta') { // Settings for using beta as the y-axis variable
        delete panel.axes.y1.ticks;
        panel.legend.orientation = 'vertical';
        panel.legend.pad_from_top = 46;
        panel.axes.y1.label = 'Normalized Effect Size (NES)';
        significance_line_layout.offset = 0; // Change dotted horizontal line to y=0
        significance_line_layout.style = {
          stroke: 'gray',
          'stroke-width': '1px',
          'stroke-dasharray': '10px 0px',
        };
        panel_base_y.field = `${panel.id}:beta`;
        delete panel_base_y.floor;
        delete panel_base_y.ceiling;
        panel_base_y.min_extent = [-1, 1];
        // Note: changing the shapes for displayed points is conflicting with the reshaping by LD -- need to fix this later
        scatter_layout.point_shape = [
          {
            scale_function: 'effect_direction',
            parameters: {
              '+': 'triangle-up',
              '-': 'triangle-down',
            },
          },
          'circle',
        ];
        scatter_layout.legend = [
          {
            shape: 'diamond',
            color: '#9632b8',
            size: 40,
            label: 'LD Ref Var',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#d43f3a',
            size: 40,
            label: '1.0 > r² ≥ 0.8',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#eea236',
            size: 40,
            label: '0.8 > r² ≥ 0.6',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#5cb85c',
            size: 40,
            label: '0.6 > r² ≥ 0.4',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#46b8da',
            size: 40,
            label: '0.4 > r² ≥ 0.2',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#357ebd',
            size: 40,
            label: '0.2 > r² ≥ 0.0',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#B8B8B8',
            size: 40,
            label: 'no r² data',
            class: 'lz-data_layer-scatter',
          },
        ];
        plot.panels[panel_id].legend.hide();
      } else if (yfield === 'log_pvalue') { // Settings for using -log10(P-value) as the y-axis variable
        delete panel.axes.y1.ticks;
        panel.legend.orientation = 'vertical';
        panel.legend.pad_from_top = 46;
        panel.axes.y1.label = '-log 10 p-value';
        significance_line_layout.offset = 7.301; // change dotted horizontal line to genomewide significant value 5e-8
        significance_line_layout.style = {
          stroke: '#D3D3D3',
          'stroke-width': '3px',
          'stroke-dasharray': '10px 10px',
        };
        panel_base_y.field = `${panel.id}:log_pvalue`;
        // Set minimum y value to zero when looking at -log10 p-values
        panel_base_y.floor = 0;
        delete panel_base_y.ceiling;
        panel_base_y.lower_buffer = 0;
        scatter_layout.point_shape = [
          {
            scale_function: 'effect_direction',
            parameters: {
              '+': 'triangle-up',
              '-': 'triangle-down',
            },
          },
          'circle',
        ];
        scatter_layout.legend = [
          {
            shape: 'diamond',
            color: '#9632b8',
            size: 40,
            label: 'LD Ref Var',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#d43f3a',
            size: 40,
            label: '1.0 > r² ≥ 0.8',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#eea236',
            size: 40,
            label: '0.8 > r² ≥ 0.6',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#5cb85c',
            size: 40,
            label: '0.6 > r² ≥ 0.4',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#46b8da',
            size: 40,
            label: '0.4 > r² ≥ 0.2',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#357ebd',
            size: 40,
            label: '0.2 > r² ≥ 0.0',
            class: 'lz-data_layer-scatter',
          },
          {
            shape: 'circle',
            color: '#B8B8B8',
            size: 40,
            label: 'no r² data',
            class: 'lz-data_layer-scatter',
          },
        ];
        plot.panels[panel_id].legend.hide();
      } else if (yfield === 'pip') {
        panel.legend.orientation = 'horizontal';
        panel.legend.pad_from_bottom = 46;
        panel_base_y.field = `${panel.id}:pip|pip_yvalue`;
        panel_base_y.floor = -6.1;
        panel_base_y.ceiling = 0.2;
        panel.axes.y1.label = 'Posterior Inclusion Probability (PIP)';
        panel.axes.y1.ticks = [
          { position: 'left', text: '1', y: 0 },
          { position: 'left', text: '0.1', y: -1 },
          { position: 'left', text: '0.01', y: -2 },
          { position: 'left', text: '1e-3', y: -3 },
          { position: 'left', text: '1e-4', y: -4 },
          { position: 'left', text: '1e-5', y: -5 },
          { position: 'left', text: '≤1e-6', y: -6 },
        ];
        scatter_layout.point_shape = [{ scale_function: 'pip_cluster' }, 'circle'];
        scatter_layout.legend = [
          { shape: 'cross', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
          { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
          { shape: 'triangle-up', size: 40, label: 'Cluster 3', class: 'lz-data_layer-scatter' },
          { shape: 'triangle-down', size: 40, label: 'Cluster 4+', class: 'lz-data_layer-scatter' },
          { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
          { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
          { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' },
        ];
        significance_line_layout.offset = -1000;
        significance_line_layout.style = {
          stroke: 'gray',
          'stroke-width': '1px',
          'stroke-dasharray': '10px 0px',
        };
        panel_base_y.min_extent = [0, 1];
        plot.panels[panel_id].legend.show();
      } else {
        throw new Error('Unrecognized yfield option');
      }
    }
  });
  plot.applyState();
}


export default {
  name: 'RegionView',
  data() {
    return {
      // Data from the api (describes the variant)
      region_data: {},

      // Data that controls the view (user-selected options)
      base_plot_sources: null,
      base_plot_layout: null,
      chrom: null,
      start: null,
      end: null,

      // Fields whose values affect options and/or URL query params
      y_field: 'log_pvalue',
      gene_id: null,
      tissue: null,

      extra_genes: [],
      extra_tissues: [],

      // Internal state
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
  },
  beforeCreate() {
    // See: https://router.vuejs.org/guide/advanced/data-fetching.html#fetching-before-navigation
    // Preserve a reference to component widgets so that their methods can be accessed directly
    //  Some- esp LZ plots- behave very oddly when wrapped as a nested observable; we can
    //  bypass these problems by assigning them as static properties instead of nested
    //  observables.
    this.assoc_plot = null;
    this.assoc_sources = null;
  },
  beforeRouteEnter(to, from, next) {
    // First navigation to route
    // TODO: Catch navigation failures (eg bad api call, no data, etc)
    getData(to.query)
      .then((data) => {
        next((vm) => {
          vm.setQuery(to.query);
          vm.setData(data);
        });
      }).catch((err) => this.$router.replace({ name: 'error' }));
  },
  beforeRouteUpdate(to, from, next) {
    // When going from one variant page to another (component is reused, only variable part of route changes)
    this.setData();
    this.assoc_plot = null;
    this.assoc_sources = null;

    getData(to.query).then((data) => {
      this.setQuery(to.query);
      this.setData(data);
      next();
    }).catch((err) => this.$router.replace({ name: 'error' }));
  },
  methods: {
    changeAnchors(tissue, gene_id) {
      const { chrom, start, end } = this;
      this.$router.push({
        name: 'region',
        query: { chrom, start, end, gene_id, tissue },
      });
    },
    setQuery(params) {
      // Set some default query params
      this.y_field = params.y_field || this.y_field;
      // Our url serializer (`$.param`) serializes array params as `key[]`; convert to `key` format
      const { 'extra_genes[]': extra_genes, 'extra_tissues[]': extra_tissues } = params;
      if (extra_genes) {
        this.extra_genes = Array.isArray(extra_genes) ? extra_genes : [extra_genes];
      }
      if (extra_tissues) {
        this.extra_tissues = Array.isArray(extra_tissues) ? extra_tissues : [extra_tissues];
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

        // TODO: Refactor to break plot creation out separate from data parsing
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
  },
  watch: {
    y_field() {
      // This param might be set when the page first loads, but the associated function
      //   requires a reference to the plot. `nextTick` says "don't fire this watcher
      //   until after the plot has been created"
      this.$nextTick(() => switchY_region(this.assoc_plot, this.y_field));
    },
    query_params() {
      // Update the URL whenever anything would change the query params
      //  (including at first page load, if the server, eg, fills in best gene/tissue for region)

      // We're very intentionally bypassing the Vue router functions here. Those would trigger
      //   a full page reload whenever params change, but we want to do incremental things
      //   (like adding plot panels) that would not benefit from a reload.

      // TODO: For now, we replaceState (eg, clicking the back button does not skip to the exact last region/ set of panels)
      //   instead of history.pushState.
      // This is because vue router assumes that the URL defines the total state of the application,
      //    and tries to forcibly reload the whole page when URL changes (eg back button). This is
      //    more re-rendering than we want. We will prioritize bookmarking the current view,
      //    at the expense of the back button.
      window.history.replaceState({}, document.title, `?${this.query_params}`);
    },
  },
  components: {
    LzPlot,
    SearchBox,
    SelectAnchors,
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
    <div class="row padtop">
      <div class="col-sm-10">
        <!-- FIXME: This link positioning is wrong. Sorry! -->
        <router-link :to="{ name: 'home' }" class="btn btn-secondary btn-sm" role="button">
          <span class="fa fa-home" aria-hidden="true"></span>
          <span class="sr-only">Home</span>
        </router-link>
        <search-box></search-box>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <h1 style="margin-top: 1em;"><strong>Single-tissue eQTLs near
          {{ region_data.symbol }} <small>(chr{{ chrom }}:{{ start && start.toLocaleString()}}-{{ end && end.toLocaleString() }})</small>
        </strong></h1>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
            <lz-plot :base_layout="base_plot_layout"
                     :base_sources="base_plot_sources"
                     :chr="chrom"
                     :start="start"
                     :end="end"
                     @region_changed="changePlotRegion"
                     @connected="receivePlot" />
      </div>
    </div>

    <!-- Bootstrap dropdown menu to choose an additional tissue to plot -->
    <div class="row justify-content-start">
      <div class="col-sm-12">

        <select-anchors @navigate="changeAnchors"
                        :current_gene="gene_id"
                        :current_tissue="tissue"
                        :gene_list="region_data.gene_list"
                        :tissue_list="region_data.tissue_list"/>

        <br>

        <!-- TODO: Improve UI here -->
        <label>Add a gene
          <select class="form-control"
            @change="addTrack('gene', $event.target.value)">
            <option disabled selected value="">(select a gene)</option>
            <option v-for="(a_symbol, a_geneid) in region_data.gene_list" :key="a_geneid"
                    :value="a_geneid">{{a_symbol}}</option>
          </select>
        </label>
        <br>

        <!-- TODO: Improve UI here -->
        <label>Add a tissue
          <select class="form-control"
            @change="addTrack('tissue', $event.target.value)">
            <option disabled selected value="">(select a tissue)</option>
            <option v-for="a_tissue in region_data.tissue_list" :key="a_tissue"
                    :value="a_tissue">{{a_tissue}}</option>
          </select>
        </label>
        <br>
      </div>
    </div>

    <div class="row">
      <!--     Convert: below this line-->
      <div class="col-sm-12">
        Change the plotted values
        <div class="btn-group pr-1">
          <form class="yaxis-display" id="transform-y">
            <!-- TODO: The dynamic :class binding code is a weird hack- using data-toggle=buttons directly causes vue and bootstrap to fight over who control of rendering
                  Since we plan to change this UI, the weird code will go away soon. (or else consider things like vue-bootstrap that massage away the differences)
            -->
            <div class="btn-group btn-group-toggle">
              <span class="d-inline-block" tabindex="0"
                    v-b-tooltip.html
                    title="Switches the y variable between -log<sub>10</sub>(P-value) and Normalized Effect Size (NES). Triangles indicate eQTLs for upregulation (pointing up) or downregulation (pointing down) of gene expression with P-values < 0.05.">
                <button type="button" class="btn btn-outline-secondary" style="pointer-events: none;"> <span class="fa fa-arrows-alt-v"></span> Y-Axis: </button>
              </span>
              <label class="btn btn-secondary"
                     :class="{ 'active': y_field === 'log_pvalue' }"
                     v-b-tooltip.top.html
                     title="Display -log<sub>10</sub>(P-values) on the Y-axis">
                <input type="radio" name="y-options" id="show-log-pvalue"
                       v-model="y_field" value="log_pvalue"> P-value
              </label>
              <label class="btn btn-secondary"
                     :class="{ 'active': y_field === 'beta' }"
                     v-b-tooltip.top.html
                     title="Displays Normalized Effect Sizes (NES) on the Y-axis. See <a href='https://www.gtexportal.org/home/documentationPage'>the GTEx Portal</a> for an explanation of NES.">
                <input type="radio" name="y-options" id="show-beta"
                       v-model="y_field" value="beta"> Effect Size
              </label>
              <label class="btn btn-secondary"
                     :class="{ 'active': y_field === 'pip' }"
                     v-b-tooltip.top.html
                    title="Displays <a href='https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1006646' target='_blank'>DAP-G</a> Posterior Inclusion Probabilities (PIP) on the Y-axis.<br>Cluster 1 denotes the cluster of variants (in LD with each other) with the strongest signal; cluster 2 denotes the set of variants with the next strongest signal; and so on.">
                <input type="radio" name="y-options" id="show-pip"
                       v-model="y_field" value="pip"> PIP
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <div class="card">
          <div class="row">
            <div class="col">
              <div class="card-body">
                <span class="d-inline-block" tabindex="0"
                      v-b-tooltip.top.html
                      title="External links for more information about this gene">
                <button class="btn btn-sm btn-secondary mr-1" style="pointer-events: none;"><span
                  class="fa fa-secondary-circle"></span><span class="fa fa-info-circle"></span> More info about {{ region_data.symbol }} </button>
                </span>

                <a :href="`https://bravo.sph.umich.edu/freeze5/hg38/gene/${ short_gene_id }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true"
                   v-b-tooltip.top.html
                   title="Gene information from NHLBI's TOPMed program, containing 463 million variants observed in 62,784 individuals in data freeze 5. <b>Requires Google login</b>">
                  BRAVO <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`https://gtexportal.org/home/gene/${ region_data.symbol }`" target="_blank"
                   class="btn btn-secondary btn-sm mr-1" role="button" aria-pressed="true"
                   v-b-tooltip.top.html
                   title="Detailed information from the GTEx Portal, including both gene and exon expression, along with single-tissue eQTLs and sQTLs.">
                  GTEx Portal <span class="fa fa-external-link-alt"></span> </a>
                <a :href="`https://gnomad.broadinstitute.org/gene/${ region_data.symbol }?dataset=gnomad_r3`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true"
                   v-b-tooltip.top
                   title="The Genome Aggregation Database (v3) at the Broad Institute, containing variant data from 71,702 sequenced genomes">
                  gnomAD <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://pheweb.sph.umich.edu/gene/${ region_data.symbol }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true" v-b-tooltip.top
                   title="PheWeb summary of association results from 1,448 electronic health record-derived phenotypes tested against up to ~6,000 cases and ~18,000 controls with genotyped and imputed samples from the Michigan Genomics Initiative">
                  MGI <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://pheweb.sph.umich.edu/SAIGE-UKB/gene/${ region_data.symbol }`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1"
                   role="button" aria-pressed="true"
                   v-b-tooltip.top
                   title="PheWeb summary of association results from the UK Biobank, with up to ~78k cases and ~409k controls, with binary outcomes analyzed with the SAIGE software">
                  UKB-SAIGE <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://big.stats.ox.ac.uk/gene/${region_data.symbol}`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true"
                   v-b-tooltip.top
                   title="Summary of 3,144 GWAS of Brain Imaging Derived Phenotypes (IDPs) in 9,707 participants from the UK Biobank, analyzed with the BGENIE software">
                  UKB-Oxford BIG <span class="fa fa-external-link-alt"></span></a>
                <a :href="`http://www.ebi.ac.uk/gxa/search?geneQuery=[{'value':'${region_data.symbol}'}]`"
                   target="_blank" class="btn btn-secondary btn-sm mr-1" role="button"
                   aria-pressed="true"
                   v-b-tooltip.top
                   title="The Expression Atlas is a project from the European Bioinformatics Institute (EMBL-EBI), with results from over 3,000 experiments from 40 different organisms, which have been manually reviewed, curated, and standardized.">
                   Expression Atlas <span class="fa fa-external-link-alt"></span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <span class="d-inline-block" tabindex="0"
              v-b-tooltip.top.html
              title="Created by Alan Kwong, Mukai Wang, Andy Boughton, Peter VandeHaar, and Hyun Min Kang. Source code can be found on <a href=https://github.com/statgen/pheget/>GitHub</a>.">
          <span class="badge badge-pill badge-secondary" style="pointer-events: none;">
          <span class="fa fa-lightbulb-o"></span> Credits
        </span>
      </span>
      </div>
    </div>
  </div>
</template>
