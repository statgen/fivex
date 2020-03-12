<script>
/**
 * The Region route. Handles initial data fetching and params.
 *
 * This helps to separate route/data behavior from rendering logic. But mostly, it's a hack for the
 *   fact that HMR doesn't work properly with vue router.
 */

import $ from 'jquery';

import { handleErrors } from '@/util';

import RegionPage from './content/Region.vue';


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
  data() {
    return {
      // Data from the api (describes the variant)
      region_data: {},

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
    addTrack(type, track_id) {
      if (type === 'tissue') {
        this.extra_tissues.push(track_id);
      } else if (type === 'gene_id') {
        this.extra_genes.push(track_id);
      } else {
        throw new Error('Unrecognized track type');
      }
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
    setData(data = {}) {
      // Convert passed params to instance variables. Also create plot and do other reactive things.
      this.region_data = data;
      const { chrom: chr, start, end, gene_id, tissue } = data;
      this.chrom = chr;
      this.start = start;
      this.end = end;
      this.gene_id = gene_id;
      this.tissue = tissue;

      this.loading_done = !!data;
    },
  },
  watch: {
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
  components: { RegionPage },
};
</script>

<template>
  <div v-if="!loading_done">
    <div class="d-flex justify-content-center align-items-center min-vh-100">
      <div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  </div>
  <div v-else class="container-fluid">
    <region-page
      @add_track="addTrack"
      :region_data="region_data"
      :chrom.sync="chrom" :start="start"
      :end.sync="end"
      :y_field.sync="y_field"
      :gene_id.sync="gene_id"
      :tissue.sync="tissue"
      :extra_genes="extra_genes"
      :extra_tissues="extra_tissues" />
  </div>
</template>
