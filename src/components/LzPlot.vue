<script>
/**
 * A generic Vue component to wrap a LocusZoom instance
 *
 * This can handle any type of plot that LocusZoom supports, including multiple panels and
 *  custom datasources
 */

import LocusZoom from 'locuszoom';

let uid = 0; // Ensure that every component instance has a unique DOM id, for use by d3
export default {
    name: 'LzPlot',
    props: {
        // The initial layout and datasources used to create this LZ instance.
        base_layout: { type: Object, default: () => ({}) },
        base_sources: { type: Array, default: () => [] },
        // Plot region
        chr: { type: String, default: '' },
        start: { type: Number, default: 0 },
        end: { type: Number, default: 0 },
        show_loading: { type: Boolean, default: false }, // Show loading indicators
    },
    computed: {
        region() { // Hack: make sure that all 3 region properties get updated atomically
            const { chr, start, end } = this;
            return { chr, start, end };
        },
    },
    watch: {
        region: {
            handler() {
                // FIXME: this component receives notifications of a value it changes, a design
                //   quirk that risks infinite update loops
                // As a safeguard, we check, and only apply new region information if it has changed
                const region = { ...this.region };
                const diffs = Object.keys(region).reduce((acc, key) => {
                    const new_val = region[key];
                    if (new_val !== this.plot.state[key]) {
                        acc[key] = new_val;
                    }
                    return acc;
                }, {});
                if (Object.keys(diffs).length) {
                    // Only re-render if the passed-in state values would be different
                    this.plot.applyState(diffs);
                }
            },
            deep: true,
        },
    },
    beforeCreate() {
        uid += 1;
        this.dom_id = `lz-plot-${uid}`; // DOM element
        this.plot_id = this.dom_id.replace(/-/g, '_'); // How to expose the plot instance globally

        // This is important: plot must be assigned as a static property. If it were a field in
        //  `data` , vue would recursively wrap it as an observable, and Really Bad Things Happen.
        this.plot = null;
        this.data_sources = null;
    },
    mounted() {
        this.createLZ(this.base_layout, this.base_sources);
    },
    beforeDestroy() {
        // Clean up plot and event listeners to prevent memory leaks
        this.plot.destroy();
        delete this.plot;
        delete window[this.plot_id];
    },
    methods: {
        /**
         * Create an LZ plot
         * @param {object} base_layout
         * @param {Array[]} base_sources
         */
        createLZ(base_layout, base_sources) {
            // Create and populate the plot
            // The layout comes from properties assigned to a vue instance, which are automatically
            //   wrapped (deeply) with Vue observable getters/setters. This can confuse LocusZoom,
            //   so we will deep-copy to ensure this is just pure JS primitives
            const layout = JSON.parse(JSON.stringify(base_layout));
            const data_sources = new LocusZoom.DataSources();
            base_sources.forEach(([name, config]) => {
                if (!data_sources.has(name)) {
                    data_sources.add(name, config);
                }
            });
            const plot = LocusZoom.populate(`#${this.dom_id}`, data_sources, layout);

            if (this.show_loading) {
                // Add loading indicator to every panel if appropriate
                plot.layout.panels.forEach((panel) => plot.panels[panel.id].addBasicLoader());
            }

            // Save references to the plot for manipulation later
            this.plot = plot;
            this.data_sources = data_sources;
            window[this.plot_id] = plot;

            // Expose events to things outside this component
            // IMPORTANT: never consume this value in a way that would wrap it as an observable
            //   (eg by assigning it to a field in `data`).
            this.connectListeners(plot);
            this.$emit('connected', plot, data_sources);
        },
        /**
         * The component should re-emit (most) plot-level event hooks built in to LocusZoom
         * @private
         * @param plot
         */
        connectListeners(plot) {
            plot.on('any_lz_event', (eventData) => this.$emit(eventData.event_name, eventData));
        },

        /**
         * Proxy a method from the component to the LZ instance
         * This allows parent components to manipulate the LZ instance, via $refs, without
         *  leaking a reference to component internal dom elements

         /**
         * Proxy a method from the component to the LZ instance
         * This allows parent components to manipulate the LZ instance, via $refs, without
         *  leaking a reference to component internal dom elements
         * @param {function} callback A callback that receives the plot object and acts upon it.
         */
        callPlot(callback) {
            // Consume return values with caution to avoid leaking internals
            return callback(this.plot);
        },

        /**
         * Proxy a method from the component to the LZ datasources
         * This allows parent components to manipulate the LZ instance, via $refs, without leaking
         *  a reference to component internals
         * @param {function} callback A callback that receives the datasources object and acts upon it.
         */
        callSources(callback) {
            // Consume return values with caution to avoid leaking internals
            return callback(this.data_sources);
        },
    },
};
</script>

<template>
  <div>
    <div
      :id="dom_id"
      class="lz-container-responsive"
    >
      <slot />
    </div>
  </div>
</template>
