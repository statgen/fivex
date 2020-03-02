<script>
import $ from 'jquery';

/**
 * A simple component to select the anchor gene (and tissue) used to define a region plot page
 */
export default {
  name: 'SelectAnchors',
  props: ['gene_list', 'tissue_list', 'current_gene', 'current_tissue'],
  data() {
    return {
      anchor_gene: this.current_gene,
      anchor_tissue: this.current_tissue,
    };
  },
  methods: {
    selectAnchor() {
      // This just renders two selection boxes. Since navigating to a region requires additional
      //  info, we emit the selected options and use them to trigger navigation
      this.$emit('navigate', this.anchor_tissue, this.anchor_gene);
    },
  },
  mounted() {
    // Popper tooltips depend on dynamic data. They must be initialized after the component
    //   has finished rendering.
    this.$nextTick(() => {
      $('[data-toggle="tooltip"]').tooltip();
      $('[data-toggle-second="tooltip"]').tooltip();
    });
  },

};
</script>


<template>
  <div>
    Select anchors (<span class="fa fa-info-circle"
                          data-toggle="tooltip"
                          data-html="true"
                          data-placement="top"
                          title="Choose a new <b>anchor tissue</b> or <b>gene</b>. All other added plots will be based on these anchors: when you add a <b>new gene</b>, the eQTLs plotted will be between that gene and the <b>anchor tissue</b>; when you add a <b>new tissue</b>, the eQTLs plotted will be between that tissue and the <b>anchor gene</b>. <br>Changing either anchor will delete all other plots and generate a single new plot, with eQTLs for the anchor gene in the anchor tissue.">
      <span class="sr-only">Info</span>
    </span>):<br>
    <form @submit.prevent="selectAnchor" class="form-inline">
      <label class="mr-2">Gene
        <select v-model="anchor_gene" class="form-control">
          <option v-for="(a_symbol, a_geneid) in gene_list" :key="a_geneid"
                  :value="a_geneid">{{a_symbol}}</option>
        </select>
      </label>

      <label class="mr-2">Tissue
        <select v-model="anchor_tissue" class="form-control">
          <option v-for="a_tissue in tissue_list" :key="a_tissue"
                  :value="a_tissue">{{a_tissue}}</option>
        </select>
      </label>

      <button type="submit" class="btn btn-secondary">Go</button>
    </form>
  </div>
</template>


<style scoped>

</style>
