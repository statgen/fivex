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
        tissues_per_study: { type: Array, default: () => [] },
        current_gene: { type: String, default: '' },
        current_tissue: { type: String, default: '' },
        current_study: { type: String, default: '' },
    },
    data() {
        return {
            anchor_gene: this.current_gene,
            // The tissue selector represents two pieces of information (since each study has its own unique list of tissues)
            anchor_tissue_and_study: {
                study_name: this.current_study,
                tissue_name: this.current_tissue,
            },
        };
    },
    methods: {
        selectAnchor() {
            // Emit the selected options, which can be used by the parent page, eg, to control navigation
            const { anchor_tissue_and_study, anchor_gene } = this;
            const { tissue_name, study_name } = anchor_tissue_and_study;

            this.$emit('navigate', study_name, tissue_name, anchor_gene);
        },
    },
};
</script>

<template>
  <div>
    <form @submit.prevent="selectAnchor">
      <div class="form-group">
        <label class="mr-2">Gene
          <b-form-select
            v-model="anchor_gene"
            :options="Object.entries(gene_list).map(([value, text]) => ({ value, text }))">
            <template #first>
              <b-form-select-option :value="null" disabled>Select gene:</b-form-select-option>
            </template>
          </b-form-select>
        </label>
      </div>

      <div class="form-group">
        <label class="mr-2">Tissue
          <b-form-select
            v-model="anchor_tissue_and_study"
            :options="tissues_per_study">
            <template #first>
              <b-form-select-option :value="null" disabled>Select tissue:</b-form-select-option>
            </template>
          </b-form-select>
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
