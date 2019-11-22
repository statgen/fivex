/* global LocusZoom */

const API_BASE = 'https://portaldev.sph.umich.edu/api/v1/';
// Set to smaller values for testing; go up to 50k or 200k after we make it more efficient
const MAX_EXTENT = 80000;
LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL(state) {
        return `${this.url}?chrom=${state.chr}&start=${state.start}&end=${state.end}&gene_id=${this.params.gene_id}&tissue=${this.params.tissue}`;
    },
    annotateData(data) {
        data.forEach(item => {
            item.variant = `${item.chromosome}:${item.position}_${item.ref_allele}/${item.alt_allele}`;
        });
        return data;
    }
});

/**
 * Get the datasources required for a single track
 * @param gene_id Full ENSG identifier (including version)
 * @param tissue The name of the associated tissue
 * @returns {Array[]} Array of configuration options for all required data sources
 */
function getTrackSources(gene_id, tissue) {
    const geneid_short = gene_id.split('.')[0];
    return [
        [`assoc_${tissue}_${geneid_short}`, ['assocGET', { url: '/api/range/', params: { gene_id, tissue } }]]
    ];
}


/**
 * Get the LocusZoom layout for a single track
 * @param {string} gene_id
 * @param {string} tissue
 * @param {object} state
 * @returns {[*]}
 */
function getTrackLayout(gene_id, tissue, state) {
    const geneid_short = gene_id.split('.')[0];

    const newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {unnamespaced: true }).tooltip;
    newscattertooltip.html = newscattertooltip.html +
                `<a href='/variant/{{{{namespace[assoc]}}chromosome}}_{{{{namespace[assoc]}}position}}/'>Search this variant</a>`;

    const namespace = { assoc: `assoc_${tissue}_${geneid_short}` };
    const assoc_layer = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
        fields: [
            '{{namespace[assoc]}}chromosome', '{{namespace[assoc]}}position', '{{namespace[assoc]}}ref_allele',
            '{{namespace[assoc]}}variant', '{{namespace[assoc]}}symbol',
            '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}beta',
            '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
        ],
        tooltip: newscattertooltip
    });
    const line = {
        type: 'orthogonal_line',
        orientation: 'vertical',
        style: { 'stroke': '#FF3333', 'stroke-width': '2px', 'stroke-dasharray': '4px 4px' }
    };

    return [
        LocusZoom.Layouts.get('panel', 'association', {
            id: `assoc_${tissue}_${geneid_short}`,
            title: {text: `Association between ${tissue} and ${geneid_short}`, x: 100, y: 30},
            namespace,
            data_layers: [
                LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                Object.assign({ id: 'start', offset: state.start }, line),
                Object.assign({ id: 'end', offset: state.end }, line),
                assoc_layer,
            ]
        })
    ];
}

/**
 * Get the LocusZoom layout for a single-track plot, filling in options as needed
 * @param {object} initial_state
 * @param {Array[]} track_panels
 * @returns {Object}
 */
function getBasicLayout(initial_state = {}, track_panels = []) {
    const newgenestooltip = LocusZoom.Layouts.get('data_layer', 'genes', {unnamespaced: true}).tooltip;
    newgenestooltip.html = newgenestooltip.html + `<br> <a onclick="addTrack('{{gene_id}}', false)" href="javascript:void(0);">Add this gene</a>`;
    const gene_track = LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true, tooltip: newgenestooltip });

    return LocusZoom.Layouts.get('plot', 'standard_association', {
        state: initial_state,
        max_region_scale: MAX_EXTENT,
        responsive_resize: 'both',
        panels: [
            ...track_panels,
            LocusZoom.Layouts.get('panel', 'genes', {
                data_layers: [gene_track]
            })
        ]
    });
}

/**
 * Get the default source configurations for a plot
 */
function getBasicSources(track_sources = []) {
    return [
        ...track_sources,
        ['ld', ['LDLZ2', { url: 'https://portaldev.sph.umich.edu/ld/', params: { source: '1000G', population: 'ALL', build: 'GRCh38' } }]],
        ['recomb', ['RecombLZ', { url: API_BASE + 'annotation/recomb/results/', params: {build: 'GRCh38'} }]],
        ['gene', ['GeneLZ', { url: API_BASE + 'annotation/genes/', params: { build: 'GRCh38' } }]],
        ['constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]],
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
    source_options.forEach(source => data_sources.add(...source));
    panel_options.forEach((panel_layout) => {
        panel_layout.y_index = -1; // Make sure genes track is always the last one
        const panel = plot.addPanel(panel_layout);
        panel.addBasicLoader();
    });
}

/**
 * Create a plot based on some simple initial options
 * @param {string} chrom
 * @param {number} center
 * @param {string} gene_id
 * @param {string} tissue
 * @param {string} selector
 * @returns {[LocusZoom.Plot, LocusZoom.DataSources]}
 */
// eslint-disable-next-line no-unused-vars
function makeSinglePlot (chrom, center, gene_id, tissue, selector) {
    const each_side = MAX_EXTENT / 2;
    const start = Math.max(+center - each_side, 1);
    const end = +center + each_side;
    const initialState = { chr: chrom, start: start, end: end };

    const track_panels = getTrackLayout(gene_id, tissue, initialState);
    const base_layout = getBasicLayout(initialState, track_panels);

    const track_sources = getTrackSources(gene_id, tissue);
    const base_sources = getBasicSources(track_sources);
    const data_sources = new LocusZoom.DataSources();
    base_sources.forEach(([name, config]) => data_sources.add(name, config));

    const plot = LocusZoom.populate(selector, data_sources, base_layout);
    return [plot, data_sources];
}

/**
 * Add a single new track to the plot
 * @param {LocusZoom.Plot} plot
 * @param {LocusZoom.DataSources} datasources
 * @param {string} gene_id
 * @param {string} tissue
 */
// eslint-disable-next-line no-unused-vars
function addTrack(plot, datasources, gene_id, tissue) {
    const track_layout = getTrackLayout(gene_id, tissue, plot.state);
    const track_sources = getTrackSources(gene_id, tissue);
    addPanels(plot, datasources, track_layout, track_sources);
}

/**
 * Switch the options used in displaying Y axis
 * @param {LocusZoom.Plot} plot
 * @param yfield Which field to use in plotting y-axis. Either 'log_pvalue' or 'beta'
 */
// eslint-disable-next-line no-unused-vars
function switchY(plot, yfield) {
    let assoc_panels = plot.layout.panels.slice(0, -1);
    if (yfield === 'beta') {
        assoc_panels.forEach(function(panel) {
            let scatter_layout = panel.data_layers[4];
            let panel_base_y = scatter_layout.y_axis;
            panel.axes.y1.label = 'Normalized Effect Size (NES)';
            panel.data_layers[0].offset = 0;  // Change dotted horizontal line to y=0
            panel.data_layers[0].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
            panel_base_y.field = panel.id + ':beta';
            delete panel_base_y.floor;
            panel_base_y.min_extent = [-1, 1];
        });
    } else if (yfield === 'log_pvalue') {
        assoc_panels.forEach(function(panel) {
            let scatter_layout = panel.data_layers[4];
            let panel_base_y = scatter_layout.y_axis;
            panel.axes.y1.label = '-log 10 p-value';
            panel.data_layers[0].offset = 7.301;  // change dotted horizontal line to genomewide significant value 5e-8
            panel.data_layers[0].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
            panel_base_y.field = panel.id + ':log_pvalue';
            // Set minimum y value to zero when looking at -log10 p-values
            panel_base_y.floor = 0;
            panel_base_y.min_extent = [0, 10];
        });
    } else {
        throw new Error('Unrecognized yfield option');
    }
    plot.applyState();
}
