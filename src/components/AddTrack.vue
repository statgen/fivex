<script>
const MODES = Object.freeze({
    GENE: 'Gene',
    TISSUE: 'Tissue',
    BOTH: 'Both',
});

export default {
    name: 'AddTrack',
    props: {
        current_gene_symbol: { type: String, default: '' },
        current_gene_id: { type: String, default: '' },
        current_tissue: { type: String, default: '' },
        current_study: { type: String, default: '' },

        gene_list: { type: Object, default: () => ({}) },
        tissues_per_study: { type: Array, default: () => [] },
    },
    data() {
        return {
            select_mode: MODES.GENE,
            selected_gene: null,
            selected_tissue_and_study: null,
        };
    },
    computed: {
        is_valid() {
            // Determine whether form is valid (allowed to click "add to track" button)
            const { select_mode, selected_gene, selected_tissue_and_study } = this;
            if ((select_mode === MODES.GENE) && !!selected_gene) {
                return false;
            } else if ((select_mode === MODES.TISSUE) && !!selected_tissue_and_study) {
                return false;
            } else if ((select_mode === MODES.BOTH) && !!selected_gene && !!selected_tissue_and_study) {
                return false;
            } else {
                return true;
            }
        },
    },
    created() {
        this.MODES = MODES;
    },
    methods: {
        addTrack() {
            let {
                select_mode,
                current_gene_id,
                current_tissue,
                current_study,
                selected_gene,
                selected_tissue_and_study,
            } = this;
            selected_gene = (select_mode !== MODES.TISSUE) ? selected_gene : current_gene_id;
            selected_tissue_and_study = (select_mode !== MODES.GENE) ? selected_tissue_and_study : { tissue_name: current_tissue, study_name: current_study };
            // Each "selected tissue" incorporates both tissue and study name
            const { tissue_name, study_name } = selected_tissue_and_study;
            this.$emit('add-track', study_name, tissue_name, selected_gene);
            this.$parent.hide();
        },
    },
};
</script>

<template>
  <div>
    <b-form-radio-group :options="Object.values(MODES)" v-model="select_mode" />
    <hr>

    <b-form-group
      label="Gene:"
    >
      <template v-if="select_mode === MODES.TISSUE">
        <em>{{ current_gene_symbol }}</em>
      </template>
      <template v-else>
        <b-form-select
          v-model="selected_gene"
          :options="Object.entries(gene_list).map(([value, text]) => ({ value, text }))"
        >
          <template #first>
            <b-form-select-option :value="null" disabled>Select one:</b-form-select-option>
          </template>
        </b-form-select>
      </template>
    </b-form-group>

    <b-form-group
      label="Tissue:"
    >
      <template v-if="select_mode === MODES.GENE">
        <em>{{ current_tissue }}</em>
      </template>
      <template v-else>
        <b-form-select
          v-model="selected_tissue_and_study"
          :options="tissues_per_study"
        >
          <template #first>
            <b-form-select-option :value="null" disabled>Select one:</b-form-select-option>
          </template>
        </b-form-select>
      </template>
    </b-form-group>

    <button
      type="submit"
      class="btn btn-secondary"
      :disabled="is_valid"
      @click="addTrack"
    >
      Add to plot
    </button>
  </div>
</template>

<style>
</style>
