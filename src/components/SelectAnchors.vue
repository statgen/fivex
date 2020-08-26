<script>

/**
 * A simple component to select the anchor gene (and tissue) used to define a region plot page
 * This exists mainly in case we wanted a "no anchors selected" landing page,
 *  so we could re-use the rendered content as a component. (demonstration of the idea of code reuse)
 */
export default {
    name: 'SelectAnchors',
    props: {
        gene_list: { type: Object, default: () => ({}) },
        tissue_list: { type: Array, default: () => [] },
        current_gene: { type: String, default: '' },
        current_tissue: { type: String, default: '' },
    },
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
};
</script>

<template>
  <div>
    <form @submit.prevent="selectAnchor">
      <div class="form-group">
        <label class="mr-2">Gene
          <select
            v-model="anchor_gene"
            class="form-control"
          >
            <option
              v-for="(a_symbol, a_geneid) in gene_list"
              :key="a_geneid"
              :value="a_geneid"
            >{{ a_symbol }}</option>
          </select>
        </label>
      </div>

      <div class="form-group">
        <label class="mr-2">Tissue
          <select
            v-model="anchor_tissue"
            class="form-control"
          >
            <option
              v-for="a_tissue in tissue_list"
              :key="a_tissue"
              :value="a_tissue"
            >{{ a_tissue }}</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        class="btn btn-secondary"
      >
        Go
      </button>
    </form>
  </div>
</template>

<style scoped></style>
