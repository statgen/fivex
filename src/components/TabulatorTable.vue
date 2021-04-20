<script>
/**
* A wrapper component that allows Tabulator and Vue to work together.
*/
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/bootstrap/tabulator_bootstrap4.min.css';

export default {
    name: 'TabulatorTable',
    props: {
        ajaxURL: {type: String, default: '' },
        table_data: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
        sort: { type: Array, default: () => [] },
        layout: { type: String, default: 'fitData' },
        layoutColumnsOnNewData: { type: Boolean, default: true },
        pagination: { type: String, default: null },
        paginationSize: { type: Number,  default: null },
        placeholder: { type: String, default: 'No data available' },
        tooltips: { type: [Function, Boolean ], default: false },
        tooltipGenerationMode: { type: String, default: 'load' },
        tooltipsHeader: { type: Boolean, default: false },
        height: { type: [String, Number], default: '100%' },
    },
    watch: {
    // Normally, both tabulator and vue want to control the DOM. We use "watchers" to bridge the gap.
    //   Vue will only control the initial render, and any changes will be handed off
    //   to Tabulator handlers (while preserving the "ergonomics" of vue data binding)
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
                // See note below: deepcopy to break shared mutable references
                const no_refs = JSON.parse(JSON.stringify(value));
                this.tabulator.setSort(no_refs);
            },
            deep: true,
        },
        ajaxUrl(value) {
            // Force reload of data when url changes
            this.tabulator.setData(value);
        },
    },
    beforeCreate() {
    // DOM-manipulating widgets should store reference statically, not dynamically
        this.tabulator = null;
    },
    beforeDestroy() {
        this.tabulator.destroy();
        delete this.tabulator;
    },
    mounted() {
        const {
            ajaxURL,
            table_data: data,
            columns,
            height,
            layout,
            layoutColumnsOnNewData,
            pagination,
            paginationSize,
            placeholder,
            tooltips,
            tooltipGenerationMode,
            tooltipsHeader,
        } = this;

        // "Fun" bug: tabulator as of 4.6 stores its state in the object passed as `initialSort`.
        // We need to deepcopy the value, or else certain rerendering events will cause infinite
        //   recursion issues in vue.
        // So far, other non-primitive values (like `data`) don't seem to be affected by this.
        const initialSort = JSON.parse(JSON.stringify(this.sort));

        this.tabulator = new Tabulator(
            this.$refs.table,
            {
                ajaxURL,
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
                ajaxResponse(url, params, response) {
                    return response.data;
                },
            },
        );
        // Expose a reference to the raw table object, for advanced usages such as click events
        this.$emit('connected', this.tabulator);
    },
    methods: {
    /**
     * Proxy a method from the component to the tabulator instance
     * This allows parent components to manipulate the table, via $refs, without leaking
     *  a reference to component internals
     */
        callTable(method_name, ...args) {
            this.tabulator[method_name](...args);
        },
    },
};
</script>

<template>
  <div>
    <div ref="table" />
  </div>
</template>
