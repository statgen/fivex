<script>
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/bootstrap/tabulator_bootstrap4.min.css';

export default {
  name: 'TabulatorTable',
  props: {
    table_data: Array,
    columns: Array,
    sort: Array,
    layout: { default: 'fitData' },
    layoutColumnsOnNewData: { default: true, type: Boolean },
    pagination: { default: 'local', type: String },
    paginationSize: { default: 20, type: Number },
    placeholder: { default: 'No data available' },
    tooltips: null,
    tooltipGenerationMode: { default: 'load' },
    tooltipsHeader: null,
    height: { default: '100%' },
  },
  beforeCreate() {
    // DOM-manipulating widgets should store reference statically, not dynamically
    this.tabulator = null;
  },
  watch: {
    table_data: {
      // Update the data used to draw the table
      handler(value) {
        this.tabulator.setData(value);
      },
      deep: true,
    },
    columns: { // Redefine the table
      handler(value) {
        this.tabulator.setColumns(value);
      },
      deep: true,
    },
    sort: { // Change the sorting field(s)
      handler(value) {
        this.tabulator.setSort(value);
      },
      deep: true,
    },
  },
  mounted() {
    const {
      table_data: data,
      columns,
      height,
      sort: initialSort,
      layout,
      layoutColumnsOnNewData,
      pagination,
      paginationSize,
      placeholder,
      tooltips,
      tooltipGenerationMode,
      tooltipsHeader,
    } = this;
    this.tabulator = new Tabulator(
      this.$refs.table,
      {
        data,
        columns,
        height,
        initialSort,
        layout,
        layoutColumnsOnNewData,
        pagination,
        paginationSize,
        placeholder,
        tooltips,
        tooltipGenerationMode,
        tooltipsHeader,
      },
    );
    // Expose a reference to the raw table object, for advanced usages such as click events
    this.$emit('connected', this.tabulator);
  },
};
</script>

<template>
  <div>
    <div ref="table">
      <slot></slot>
    </div>
  </div>
</template>
