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

        gene_list: { type: Object, default: () => ({}) },
        tissue_list: { type: Array, default: () => [] },
    },
    data() {
        return {
            select_mode: MODES.GENE,
            selected_gene: null,
            selected_tissue: null,
        };
    },
    computed: {
        is_valid() {
            // Determine whether form is valid (allowed to click "add to track" button)
            const { select_mode, selected_gene, selected_tissue } = this;
            if ((select_mode === MODES.GENE) && !!selected_gene) {
                return false;
            } else if ((select_mode === MODES.TISSUE) && !!selected_tissue) {
                return false;
            } else if ((select_mode === MODES.BOTH) && !!selected_gene && !!selected_tissue) {
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
                selected_gene,
                selected_tissue,
            } = this;
            selected_gene = (select_mode !== MODES.TISSUE) ? selected_gene : current_gene_id;
            selected_tissue = (select_mode !== MODES.GENE) ? selected_tissue : current_tissue;

            this.$emit('add-track', selected_gene, selected_tissue);
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
          v-model="selected_tissue"
          :options="tissue_list"
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
