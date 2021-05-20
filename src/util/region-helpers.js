import LocusZoom from 'locuszoom';
import { PORTALDEV_URL } from '@/util/common';

const MAX_EXTENT = 1000000;

function sourceName(display_name) {
    return display_name.replace(/[^A-Za-z0-9_]/g, '_');
}

/**
 * Get the datasources required for a single track
 * @param gene_id Full ENSG identifier (including version)
 * @param {string} study_name The name of the study containing the dataset. Each study has their own unique list of tissues available, and the tissue and study are typically specified together (both fields are required to identify the specific tissue data of interest)
 * @param {string} tissue The name of the associated tissue
 * @returns {Array[]} Array of configuration options for all required data sources
 */
export function getTrackSources(gene_id, study_name, tissue) {
    const geneid_short = gene_id.split('.')[0];
    return [
        [sourceName(`assoc_${tissue}_${study_name}_${geneid_short}`), ['AssocFIVEx', {
            url: '/api/data/region',
            params: { gene_id, tissue, study: study_name },
        }]],
    ];
}

/**
 * Get the LocusZoom layout for a single track
 * @param {string} gene_id
 * @param {string} tissue
 * @param {object} state
 * @param {String} genesymbol
 * @returns {[*]}
 */
export function getTrackLayout(gene_id, study_name, tissue, state, genesymbol) {
    const symbol = genesymbol || gene_id;
    const geneid_short = gene_id.split('.')[0];

    const newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true }).tooltip;
    // FIXME: Right now, region pages are eqtl only; they don't show sQTLs. As such, the phewas page links hardcode to the eqtl view.
    newscattertooltip.html = `${newscattertooltip.html.replace('Make LD Reference', 'Set LD Reference')}
        <a href='/variant/eqtl/{{{{namespace[assoc]}}chromosome|urlencode}}_{{{{namespace[assoc]}}position|urlencode}}/'>Go to single-variant view</a><br>
        Study: <strong>{{{{namespace[assoc]}}study}}</strong> <br>
        Gene: <strong><i>{{{{namespace[assoc]}}symbol}}</i></strong> <br>
        MAF: <strong>{{{{namespace[assoc]}}maf|twosigfigs}}</strong> <br>
        Effect Size: <strong>{{{{namespace[assoc]}}beta|twosigfigs}}</strong> <br>
        PIP: <strong>{{{{namespace[assoc]}}pip|pip_display}}</strong> <br>
        Credible set label: <strong>{{{{namespace[assoc]}}cs_index}}</strong> <br>
        Credible set size: <strong>{{{{namespace[assoc]}}cs_size}}</strong> <br>
        rsid: <strong>{{{{namespace[assoc]}}rsid}}</strong> <br>`;

    const namespace = { assoc: sourceName(`assoc_${tissue}_${study_name}_${geneid_short}`) };
    const assoc_layer = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
        fields: [
            '{{namespace[assoc]}}chromosome', '{{namespace[assoc]}}position',
            '{{namespace[assoc]}}study',
            '{{namespace[assoc]}}ref_allele',
            '{{namespace[assoc]}}variant', '{{namespace[assoc]}}symbol',
            '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}beta',
            '{{namespace[assoc]}}stderr_beta', '{{namespace[assoc]}}maf',
            '{{namespace[assoc]}}pip', '{{namespace[assoc]}}pip|pip_yvalue',
            '{{namespace[assoc]}}cs_size', '{{namespace[assoc]}}cs_index',
            '{{namespace[assoc]}}rsid',
            '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
        ],
        tooltip: newscattertooltip,
    });

    const layoutBase = LocusZoom.Layouts.get('panel', 'association', {
        id: sourceName(`assoc_${tissue}_${study_name}_${geneid_short}`),
        height: 275,
        title: { // Remove this when LocusZoom update with the fix to toolbar titles is published
            text: `${symbol} in ${tissue} (${study_name})`,
            x: 60,
            y: 30,
        },
        namespace,
        data_layers: [
            LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
            LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
            assoc_layer,
        ],
    });
    layoutBase.axes.y1.label_offset = 36;
    return [layoutBase];
}

/**
 * Get the LocusZoom layout for a single-track plot, filling in options as needed
 * @param {object} initial_state
 * @param {Array[]} track_panels
 * @returns {Object}
 */
export function getBasicLayout(initial_state = {}, track_panels = []) {
    const newgenestooltip = LocusZoom.Layouts.get('data_layer', 'genes_filtered', { unnamespaced: true }).tooltip;
    // FIXME: tooltip link does not work in principle (relies on a global variable and function isn't defined globally)
    // newgenestooltip.html += `<br> <a onclick="addTrack('{{gene_id}}', false)" href="javascript:void(0);">Add this gene</a>`;
    const gene_track = LocusZoom.Layouts.get('data_layer', 'genes_filtered', {
        unnamespaced: true,
        tooltip: newgenestooltip,
    });

    return LocusZoom.Layouts.get('plot', 'standard_association', {
        state: initial_state,
        max_region_scale: MAX_EXTENT,
        responsive_resize: true,
        panels: [
            ...track_panels,
            LocusZoom.Layouts.get('panel', 'genes', { data_layers: [gene_track] }),
        ],
    });
}

/**
 * Get the default source configurations for a plot
 */
export function getBasicSources(track_sources = []) {
    return [
        ...track_sources,
        ['ld', ['LDLZ2', {
            url: 'https://portaldev.sph.umich.edu/ld/',
            params: { source: '1000G', population: 'ALL', build: 'GRCh38' },
        }]],
        ['recomb', ['RecombLZ', {
            url: `${PORTALDEV_URL}annotation/recomb/results/`,
            params: { build: 'GRCh38' },
        }]],
        ['gene', ['GeneLZ', { url: `${PORTALDEV_URL}annotation/genes/`, params: { build: 'GRCh38' } }]],
        ['constraint', ['GeneConstraintLZ', {
            url: 'https://gnomad.broadinstitute.org/api',
            params: { build: 'GRCh38' },
        }]],
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
    source_options.forEach((source) => {
        if (!data_sources.has(source[0])) {
            data_sources.add(...source);
        }
    });
    panel_options.forEach((panel_layout) => {
        panel_layout.y_index = -1; // Make sure genes track is always the last one
        const panel = plot.addPanel(panel_layout);
        panel.addBasicLoader();
    });
}

/**
 * Add a single new track to the plot
 * @param {LocusZoom.Plot} plot
 * @param {LocusZoom.DataSources} datasources
 * @param {string} gene_id
 * @param {string} tissue
 * @param {string} study_name
 * @param {string} genesymbol
 */
export function addTrack(plot, datasources, gene_id, tissue, study_name, genesymbol) {
    const track_layout = getTrackLayout(gene_id, study_name, tissue, plot.state, genesymbol);
    const track_sources = getTrackSources(gene_id, study_name, tissue);
    addPanels(plot, datasources, track_layout, track_sources);
}

/**
 * Switch the options used in displaying Y axis
 * @param {LocusZoom.Plot} plot
 * @param yfield Which field to use in plotting y-axis. Either 'log_pvalue', 'beta', or 'pip'
 */
export function switchY_region(plot, yfield) {
    // Iterate through all panels, including any added panels
    Object.keys(plot.panels).forEach((panel_id) => {
        const panel = plot.panels[panel_id].layout;
        if (panel.data_layers.some((d) => d.id === 'associationpvalues') && panel.data_layers.some((d) => d.id === 'significance')) {
            const scatter_layout = panel.data_layers.find((d) => d.id === 'associationpvalues');
            const panel_base_y = scatter_layout.y_axis;
            const significance_line_layout = panel.data_layers.find((d) => d.id === 'significance');
            if (yfield === 'beta') { // Settings for using beta as the y-axis variable
                delete panel.axes.y1.ticks;
                panel.legend.orientation = 'vertical';
                panel.axes.y1.label = 'Normalized Effect Size (NES)';
                significance_line_layout.offset = 0; // Change dotted horizontal line to y=0
                significance_line_layout.style = {
                    stroke: 'gray',
                    'stroke-width': '1px',
                    'stroke-dasharray': '10px 0px',
                };
                panel_base_y.field = `${panel.id}:beta`;
                delete panel_base_y.floor;
                delete panel_base_y.ceiling;
                panel_base_y.min_extent = [-1, 1];
                // Note: changing the shapes for displayed points is conflicting with the reshaping by LD -- need to fix this later
                scatter_layout.point_shape = [
                    {
                        scale_function: 'effect_direction',
                        parameters: {
                            '+': 'triangle',
                            '-': 'triangledown',
                        },
                    },
                    'circle',
                ];
                scatter_layout.legend = [
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' },
                ];
                plot.panels[panel_id].legend.hide();
            } else if (yfield === 'log_pvalue') { // Settings for using -log10(P-value) as the y-axis variable
                delete panel.axes.y1.ticks;
                panel.legend.orientation = 'vertical';
                panel.axes.y1.label = '-log10 p-value';
                significance_line_layout.offset = 7.301; // change dotted horizontal line to genomewide significant value 5e-8
                significance_line_layout.style = {
                    stroke: '#D3D3D3',
                    'stroke-width': '3px',
                    'stroke-dasharray': '10px 10px',
                };
                panel_base_y.field = `${panel.id}:log_pvalue`;
                // Set minimum y value to zero when looking at -log10 p-values
                panel_base_y.floor = 0;
                delete panel_base_y.ceiling;
                panel_base_y.lower_buffer = 0;
                scatter_layout.point_shape = [
                    {
                        scale_function: 'effect_direction',
                        parameters: {
                            '+': 'triangle',
                            '-': 'triangledown',
                        },
                    },
                    'circle',
                ];
                scatter_layout.legend = [
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' },
                ];
                plot.panels[panel_id].legend.hide();
            } else if (yfield === 'pip') {
                panel.legend.orientation = 'horizontal';
                panel_base_y.field = `${panel.id}:pip|pip_yvalue`;
                panel_base_y.floor = -4.1;
                panel_base_y.ceiling = 0.2;
                panel_base_y.upper_buffer = 0.1;
                panel.axes.y1.label = 'Posterior Inclusion Probability (PIP)';
                panel.axes.y1.ticks = [
                    { position: 'left', text: '1', y: 0 },
                    { position: 'left', text: '0.1', y: -1 },
                    { position: 'left', text: '0.01', y: -2 },
                    { position: 'left', text: '1e-3', y: -3 },
                    { position: 'left', text: '≤1e-4', y: -4 },

                ];
                // Modified from using pip_cluster as the shape
                scatter_layout.point_shape = [{ scale_function: 'pip_cluster' }, 'circle'];
                scatter_layout.legend = [
                    { shape: 'cross', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
                    { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
                    { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
                    { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' },
                ];
                significance_line_layout.offset = -1000;
                significance_line_layout.style = {
                    stroke: 'gray',
                    'stroke-width': '1px',
                    'stroke-dasharray': '10px 0px',
                };
                panel_base_y.min_extent = [0, 1];
                plot.panels[panel_id].legend.show();
            } else {
                throw new Error('Unrecognized yfield option');
            }
        }
    });
    plot.applyState();
}
