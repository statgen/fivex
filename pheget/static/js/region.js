/* global LocusZoom, $ */

const API_BASE = 'https://portaldev.sph.umich.edu/api/v1/';
// Set to smaller values for testing; go up to 50k or 200k after we make it more efficient
const MAX_EXTENT = 500000;


LocusZoom.TransformationFunctions.set('pip_yvalue', function (x) {return Math.max(Math.log10(x), -6);});

var retrieveBySuffix = function(input, suffix) {
    var return_array = Object.entries(input)
        .filter( function(x) {return x[0].endsWith(suffix); } )
        .map( function(x) { return x[1];});
    if (return_array.length !== 1) { return null; }
    return return_array[0];
};

LocusZoom.ScaleFunctions.add('pip_cluster', function (parameters, input) {
    // console.log(input);
    if (typeof input !== 'undefined') {
        var pip_cluster = retrieveBySuffix(input, ':cluster');
        if (pip_cluster === null) { return null; }
        if (pip_cluster === 1) {
            return 'cross';
        }
        if (pip_cluster === 2) {
            return 'square';
        }
        if (pip_cluster === 3) {
            return 'triangle-up';
        }
        if (pip_cluster >= 4) {
            return 'triangle-down';
        }
    }
    return null;
});

LocusZoom.ScaleFunctions.add('effect_direction', function (parameters, input) {
    if (typeof input !== 'undefined') {
        var beta = retrieveBySuffix(input, ':beta');
        var stderr_beta = retrieveBySuffix(input, ':stderr_beta');
        if (beta === null || stderr_beta === null) { return null; }
        // var beta = input['assoc:beta'];
        // var stderr_beta = input['assoc:stderr_beta'];
        if (!isNaN(beta) && !isNaN(stderr_beta)) {
            if (beta - 1.96 * stderr_beta > 0) {
                return parameters['+'] || null;
            } // 1.96*se to find 95% confidence interval
            if (beta + 1.96 * stderr_beta < 0) {
                return parameters['-'] || null;
            }
        }
    }
    return null;
});


LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL(state) {
        let url = `${this.url}/${state.chr}/${state.start}-${state.end}/`;
        let params = {};
        if (this.params.gene_id) {
            params.gene_id = this.params.gene_id;
        }
        if (this.params.tissue) {
            params.tissue = this.params.tissue;
        }
        params = $.param(params);
        return `${url}?${params}`;
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
        [`assoc_${tissue}_${geneid_short}`, ['assocGET', { url: '/api/region', params: { gene_id, tissue } }]]
    ];
}


/**
 * Get the LocusZoom layout for a single track
 * @param {string} gene_id
 * @param {string} tissue
 * @param {object} state
 * @returns {[*]}
 */
function getTrackLayout(gene_id, tissue, state, genesymbol) {
    genesymbol = genesymbol || gene_id;
    const geneid_short = gene_id.split('.')[0];

    const newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true }).tooltip;
    newscattertooltip.html = newscattertooltip.html +
        `<strong>Gene</strong>: <i>{{{{namespace[assoc]}}symbol}}</i> <br>
        <strong>NES</strong>: {{{{namespace[assoc]}}beta}} <br>
        <strong>PIP</strong>: {{{{namespace[assoc]}}pip}} <br>
        <strong>SPIP</strong>: {{{{namespace[assoc]}}spip}} <br>
        <strong>PIP cluster</strong>: {{{{namespace[assoc]}}cluster}} <br>
        <a href='/variant/{{{{namespace[assoc]}}chromosome}}_{{{{namespace[assoc]}}position}}/'>Go to single-variant view</a>`;

    const namespace = { assoc: `assoc_${tissue}_${geneid_short}` };
    const assoc_layer = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
        fields: [
            '{{namespace[assoc]}}chromosome', '{{namespace[assoc]}}position',
            '{{namespace[assoc]}}ref_allele',
            '{{namespace[assoc]}}variant', '{{namespace[assoc]}}symbol',
            '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}beta',
            '{{namespace[assoc]}}stderr_beta',
            '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
            '{{namespace[assoc]}}pip', '{{namespace[assoc]}}pip|pip_yvalue',
            '{{namespace[assoc]}}spip', '{{namespace[assoc]}}cluster',
        ],
        tooltip: newscattertooltip
    });

    const layoutBase =
        LocusZoom.Layouts.get('panel', 'association', {
            id: `assoc_${tissue}_${geneid_short}`,
            title: {  // Remove this when LocusZoom update with the fix to dashboard titles is published
                text: `${genesymbol} in ${tissue}`,
                x: 60,
                y: 30
            },
            namespace,
            data_layers: [
                LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                assoc_layer,
            ]
        });
    layoutBase.axes.y1.label_offset = 36;

    /* Add this back in when LocusZoom update is published
    layoutBase.dashboard.components.push(
        {
            type: 'title',
            title: `<i>${genesymbol}</i> in ${tissue}`,
            position: 'left'
        }
    );
    */

    return [layoutBase];
}

/**
 * Get the LocusZoom layout for a single-track plot, filling in options as needed
 * @param {object} initial_state
 * @param {Array[]} track_panels
 * @returns {Object}
 */
function getBasicLayout(initial_state = {}, track_panels = []) {
    const newgenestooltip = LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true }).tooltip;
    newgenestooltip.html = newgenestooltip.html + `<br> <a onclick="addTrack('{{gene_id}}', false)" href="javascript:void(0);">Add this gene</a>`;
    const gene_track = LocusZoom.Layouts.get('data_layer', 'genes', {
        unnamespaced: true,
        tooltip: newgenestooltip,
        exon_height: 8,
        bounding_box_padding: 5,
        track_vertical_spacing: 5,
        exon_label_spacing: 3
    });

    const base_layout = LocusZoom.Layouts.get('plot', 'standard_association', {
        state: initial_state,
        max_region_scale: MAX_EXTENT,
        responsive_resize: 'width_only',
        dashboard: {
            components: [
                {
                    color: 'gray',
                    position: 'right',
                    type: 'download'
                }
            ]
        },

        panels: [
            ...track_panels,
            LocusZoom.Layouts.get('panel', 'genes', {
                data_layers: [gene_track]
            })
        ]
    });
    base_layout.dashboard.components.push(LocusZoom.Layouts.get('dashboard_components', 'ldlz2_pop_selector'));
    return base_layout;
}

/**
 * Get the default source configurations for a plot
 */
function getBasicSources(track_sources = []) {
    return [
        ...track_sources,
        ['ld', ['LDLZ2', {
            url: 'https://portaldev.sph.umich.edu/ld/',
            params: { source: '1000G', population: 'ALL', build: 'GRCh38' }
        }]],
        ['recomb', ['RecombLZ', { url: API_BASE + 'annotation/recomb/results/', params: { build: 'GRCh38' } }]],
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
 * @param {number} start
 * @param {number} end
 * @param {string} gene_id
 * @param {string} tissue
 * @param {string} selector
 * @returns {[LocusZoom.Plot, LocusZoom.DataSources]}
 */
// eslint-disable-next-line no-unused-vars
function makeSinglePlot(gene_id, tissue, selector, genesymbol) {
    const stateUrlMapping = {chr: 'chrom', start: 'start', end: 'end'};
    // The backend guarantees that these params will be part of the URL on pageload
    const initialState = LocusZoom.ext.DynamicUrls.paramsFromUrl(stateUrlMapping);
    const track_panels = getTrackLayout(gene_id, tissue, initialState, genesymbol);
    const base_layout = getBasicLayout(initialState, track_panels);

    const track_sources = getTrackSources(gene_id, tissue);
    const base_sources = getBasicSources(track_sources);
    const data_sources = new LocusZoom.DataSources();
    base_sources.forEach(([name, config]) => data_sources.add(name, config));

    const plot = LocusZoom.populate(selector, data_sources, base_layout);

    // Changes in the plot can be reflected in the URL, and vice versa (eg browser back button can go back to
    //   a previously viewed region)
    LocusZoom.ext.DynamicUrls.plotUpdatesUrl(plot, stateUrlMapping);
    LocusZoom.ext.DynamicUrls.plotWatchesUrl(plot, stateUrlMapping);
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
function addTrack(plot, datasources, gene_id, tissue, genesymbol) {
    const track_layout = getTrackLayout(gene_id, tissue, plot.state, genesymbol);
    const track_sources = getTrackSources(gene_id, tissue);
    addPanels(plot, datasources, track_layout, track_sources);
}


/**
 * Switch the options used in displaying Y axis
 * @param {LocusZoom.Plot} plot
 * @param yfield Which field to use in plotting y-axis. Either 'log_pvalue', 'beta', or 'pip'
 */
// eslint-disable-next-line no-unused-vars
function switchY_region(plot, yfield) {
    let assoc_panels = plot.layout.panels;  // Iterate through all panels, including any added panels
    assoc_panels.forEach(function (panel) {
        if (panel.data_layers.some(d => d.id === 'associationpvalues') && panel.data_layers.some(d => d.id === 'significance')) {
            let scatter_layout = panel.data_layers.find(d => d.id === 'associationpvalues');
            console.log(scatter_layout);
            let panel_base_y = scatter_layout.y_axis;
            let significance_line_layout = panel.data_layers.find(d => d.id === 'significance');
            if (yfield === 'beta') {   // Settings for using beta as the y-axis variable
                panel.legend.orientation = 'vertical';
                panel.legend.pad_from_top = 46;
                panel.axes.y1.label = 'Normalized Effect Size (NES)';
                significance_line_layout.offset = 0;  // Change dotted horizontal line to y=0
                significance_line_layout.style = {
                    'stroke': 'gray',
                    'stroke-width': '1px',
                    'stroke-dasharray': '10px 0px'
                };
                panel_base_y.field = panel.id + ':beta';
                delete panel_base_y.floor;
                delete panel_base_y.ceiling;
                panel_base_y.min_extent = [-1, 1];
                // Note: changing the shapes for displayed points is conflicting with the reshaping by LD -- need to fix this later
                scatter_layout.point_shape = [
                    {
                        scale_function: 'effect_direction',
                        parameters: {
                            '+': 'triangle-up',
                            '-': 'triangle-down'
                        }
                    },
                    'circle'
                ];
                scatter_layout.legend = [
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' }
                ];
            } else if (yfield === 'log_pvalue') {  // Settings for using -log10(P-value) as the y-axis variable
                panel.legend.orientation = 'vertical';
                panel.legend.pad_from_top = 46;
                panel.axes.y1.label = '-log 10 p-value';
                significance_line_layout.offset = 7.301;  // change dotted horizontal line to genomewide significant value 5e-8
                significance_line_layout.style = {
                    'stroke': '#D3D3D3',
                    'stroke-width': '3px',
                    'stroke-dasharray': '10px 10px'
                };
                panel_base_y.field = panel.id + ':log_pvalue';
                // Set minimum y value to zero when looking at -log10 p-values
                panel_base_y.floor = 0;
                delete panel_base_y.ceiling;
                panel_base_y.lower_buffer = 0;
                scatter_layout.point_shape = [
                    {
                        scale_function: 'effect_direction',
                        parameters: {
                            '+': 'triangle-up',
                            '-': 'triangle-down'
                        }
                    },
                    'circle'
                ];
                scatter_layout.legend = [
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' }
                ];
            } else if (yfield === 'pip') {
                panel.legend.orientation = 'horizontal';
                panel.legend.pad_from_bottom = 46;
                panel_base_y.field = panel.id + ':pip|pip_yvalue';
                panel_base_y.floor = -6.1;
                panel_base_y.ceiling = 0.2;
                panel.axes.y1.label = 'Posterior Inclusion Probability (PIP)';
                panel.axes.y1.ticks = [
                    {position: 'left', text: '1', y: 0},
                    {position: 'left', text: '0.1', y: -1},
                    {position: 'left', text: '0.01', y: -2},
                    {position: 'left', text: '1e-3', y: -3},
                    {position: 'left', text: '1e-4', y: -4},
                    {position: 'left', text: '1e-5', y: -5},
                    {position: 'left', text: '≤1e-6', y: -6}
                ];
                scatter_layout.point_shape = [
                    {
                        scale_function: 'pip_cluster',
                    },
                    'circle'
                ];
                scatter_layout.legend = [
                    { shape: 'cross', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
                    { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
                    { shape: 'triangle-up', size: 40, label: 'Cluster 3', class: 'lz-data_layer-scatter' },
                    { shape: 'triangle-down', size: 40, label: 'Cluster 4+', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' }
                ];
                significance_line_layout.offset = -1000;
                significance_line_layout.style = {
                    'stroke': 'gray',
                    'stroke-width': '1px',
                    'stroke-dasharray': '10px 0px'
                };
                panel_base_y.min_extent = [0, 1];
            } else {
                throw new Error('Unrecognized yfield option');
            }
        }
    });
    plot.applyState();
}
