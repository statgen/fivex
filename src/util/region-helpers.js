import LocusZoom from 'locuszoom';
import { PORTALDEV_URL, pip_fmt, two_digit_fmt1, two_digit_fmt2 } from '@/util/common';

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
 * Customize the layout of a single LocusZoom association panel so that it shows a particular thing on the y-axis
 * @param panel_layout
 * @param y_field log_pvalue, beta, or pip
 * @private
 */
function _set_panel_yfield(y_field, panel_layout) {
    // Updates to the panel: legend (orientation), axis labels, and ticks
    // Update scatter plot: point shape, y-axis, and legend options
    // Update line of significance: threshold

    const scatter_layout = panel_layout.data_layers.find((d) => d.id === 'associationpvalues');
    const assoc_y_options = scatter_layout.y_axis;
    const significance_line_layout = panel_layout.data_layers.find((d) => d.id === 'significance');
    if (y_field === 'beta') { // Settings for using beta as the y-axis variable
        delete panel_layout.axes.y1.ticks;
        panel_layout.legend.orientation = 'vertical';
        panel_layout.axes.y1.label = 'Normalized Effect Size (NES)';
        significance_line_layout.offset = 0; // Change dotted horizontal line to y=0
        significance_line_layout.style = {
            stroke: 'gray',
            'stroke-width': '1px',
            'stroke-dasharray': '10px 0px',
        };
        assoc_y_options.field = `${panel_layout.id}:beta`;
        delete assoc_y_options.floor;
        delete assoc_y_options.ceiling;
        assoc_y_options.min_extent = [-1, 1];
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
        panel_layout.legend.hidden = true;
    } else if (y_field === 'log_pvalue') { // Settings for using -log10(P-value) as the y-axis variable
        delete panel_layout.axes.y1.ticks;
        panel_layout.legend.orientation = 'vertical';
        panel_layout.axes.y1.label = '-log10 p-value';
        significance_line_layout.offset = 7.301; // change dotted horizontal line to genomewide significant value 5e-8
        significance_line_layout.style = {
            stroke: '#D3D3D3',
            'stroke-width': '3px',
            'stroke-dasharray': '10px 10px',
        };
        assoc_y_options.field = `${panel_layout.id}:log_pvalue`;
        // Set minimum y value to zero when looking at -log10 p-values
        assoc_y_options.floor = 0;
        delete assoc_y_options.ceiling;
        assoc_y_options.lower_buffer = 0;
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
        panel_layout.legend.hidden = true;
    } else if (y_field === 'pip') {
        panel_layout.legend.orientation = 'horizontal';
        assoc_y_options.field = `${panel_layout.id}:pip|pip_yvalue`;
        assoc_y_options.floor = -4.1;
        assoc_y_options.ceiling = 0.9;  // Max log value is 0 (PIP=1); pad ceiling to ensure that legend appears above all points FIXME: redo legend
        assoc_y_options.upper_buffer = 0.1;
        panel_layout.axes.y1.label = 'Posterior Inclusion Probability (PIP)';
        panel_layout.axes.y1.ticks = [
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
        assoc_y_options.min_extent = [0, 1];
        panel_layout.legend.hidden = false;
    } else {
        throw new Error('Unrecognized y_field option');
    }
    return panel_layout;
}


/**
 * Get the LocusZoom layout for a single track
 * @param {string} gene_id
 * @param study_name The study name, as used in human-readable panel titles
 * @param {string} tissue
 * @param {object} state
 * @param {String} genesymbol
 * @param {String} y_field The name of the field to use for y-axis display; same as used in interactive layout mutations
 * @returns {[*]}
 */
export function getTrackLayout(gene_id, study_name, tissue, state, genesymbol, y_field) {
    const symbol = genesymbol || gene_id;
    const geneid_short = gene_id.split('.')[0];

    const newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true }).tooltip;
    // FIXME: Right now, region pages are eqtl only; they don't show sQTLs. As such, the phewas page links hardcode to the eqtl view.
    newscattertooltip.html = `<strong>{{{{namespace[assoc]}}variant|htmlescape}}</strong><br>
        P Value: <strong>{{{{namespace[assoc]}}log_pvalue|logtoscinotation|htmlescape}}</strong><br>
        Ref. Allele: <strong>{{{{namespace[assoc]}}ref_allele|htmlescape}}</strong><br>
        <a href="javascript:void(0);"
        onclick="var data = this.parentNode.__data__;
                 data.getDataLayer().makeLDReference(data);"
                 >Set LD Reference</a><br>
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

    // For now, we'll apply user-modifications to the layout at the end in one big mutation instead of in the base layout
    _set_panel_yfield(y_field, layoutBase);
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
export function addTrack(plot, datasources, gene_id, tissue, study_name, genesymbol, y_field) {
    const track_layout = getTrackLayout(gene_id, study_name, tissue, plot.state, genesymbol, y_field);
    const track_sources = getTrackSources(gene_id, study_name, tissue);
    addPanels(plot, datasources, track_layout, track_sources);
}

/**
 * Switch the options used in displaying Y axis
 * @param y_field Which field to use in plotting y-axis. Either 'log_pvalue', 'beta', or 'pip'
 * @param plot_layout
 */
export function switchY_region(plot_layout, y_field) {
    // Apply a layout mutation to all matching panels
    LocusZoom.Layouts.mutate_attrs(plot_layout, '$..panels[?(@.tag === "association")]', _set_panel_yfield.bind(null, y_field));
}


export function get_region_table_config() {
    return [
        {
            title: 'Variant', field: 'variant_id', formatter: 'link',
            sorter(a, b, aRow, bRow, column, dir, sorterParams) {
                // Sort by chromosome, then position
                const a_data = aRow.getData();
                const b_data = bRow.getData();
                return (a_data.chromosome).localeCompare(b_data.chromosome, undefined, { numeric: true })
                    || a_data.position - b_data.position;
            },
            formatterParams: {
                url: (cell) => {
                    const data = cell.getRow().getData();
                    // FIXME: Region pages only handle eqtls at present, so we hardcode a link to the eqtl version of the page
                    return `/variant/eqtl/${data.chromosome}_${data.position}`;
                },
            },
        },
        { title: 'Study', field: 'study', headerFilter: true },
        { title: 'Tissue', field: 'tissue', headerFilter: true },
        // TODO: Convert these gene_ids to gene symbols for ease of reading
        { title: 'Gene', field: 'gene_id', headerFilter: true },
        {
            title: '-log<sub>10</sub>(p)',
            field: 'log_pvalue',
            formatter: two_digit_fmt2,
            sorter: 'number',
        },
        { title: 'Effect Size', field: 'beta', formatter: two_digit_fmt1, sorter: 'number' },
        { title: 'SE (Effect Size)', field: 'stderr_beta', formatter: two_digit_fmt1 },
        { title: 'PIP', field: 'pip', formatter: pip_fmt, sorter: 'number' },
        { title: 'CS Label', field: 'cs_index' },
        { title: 'CS Size', field: 'cs_size' },
    ];
}
