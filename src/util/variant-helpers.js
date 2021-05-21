import LocusZoom from 'locuszoom';

import { PORTALDEV_URL } from '@/util/common';

// Currently default to gene expression data if no parameter is passed, otherwise use indicated datatype
export function getPlotSources(chrom, pos, datatype = 'ge') {
    return [
        ['phewas', ['PheWASFIVEx', { url: `/api/data/variant/${chrom}_${pos}/?datatype=${datatype}` }]],
        ['gene', ['GeneLZ', { url: `${PORTALDEV_URL}annotation/genes/`, params: { build: 'GRCh38' } }]],
        ['constraint', ['GeneConstraintLZ', {
            url: 'https://gnomad.broadinstitute.org/api',
            params: { build: 'GRCh38' },
        }]],
    ];
}

export function getPlotLayout(chrom, pos, initialState = {}) {
    return LocusZoom.Layouts.get('plot', 'standard_phewas', {
        responsive_resize: true,
        state: initialState,
        toolbar: {
            widgets: [
                {
                    color: 'gray',
                    position: 'right',
                    type: 'download',
                    group_position: 'end',
                },
                {
                    color: 'gray',
                    position: 'right',
                    type: 'download_png',
                    group_position: 'start',

                },

            ],
        },
        panels: [
            ((() => {
                const panel = LocusZoom.Layouts.get('panel', 'phewas', {
                    unnamespaced: true,
                    min_height: 450,
                    height: 450,
                    toolbar: {
                        widgets: [
                            {
                                color: 'gray',
                                position: 'right',
                                type: 'toggle_legend',
                            },
                            {
                                type: 'filter_field',
                                position: 'right',
                                layer_name: 'phewaspvalues',
                                field: 'phewas:symbol',
                                field_display_html: 'Gene name',
                                operator: 'match',
                                input_size: 8,
                                data_type: 'string',
                            },
                            {
                                type: 'filter_field',
                                position: 'right',
                                layer_name: 'phewaspvalues',
                                field: 'phewas:pip',
                                field_display_html: 'PIP',
                                operator: '>',
                                input_size: 4,
                                data_type: 'number',
                            },
                            {
                                type: 'filter_field',
                                position: 'right',
                                layer_name: 'phewaspvalues',
                                field: 'phewas:log_pvalue',
                                field_display_html: '-log<sub>10</sub> p',
                                operator: '>',
                                input_size: 4,
                                data_type: 'number',
                            },
                        ],
                    },
                    legend: {
                        orientation: 'vertical',
                        origin: { x: 55, y: 30 },
                        pad_from_right: 50 + 10, // 50 is panel.margin.right
                        hidden: true,
                    },
                    data_layers: [
                        ((() => {
                            const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true,
                                coalesce: {
                                    // Prevent sQTL datasets from overwhelming the browser DOM, by only rendering nonoverlapping significant ones
                                    max_points: 1000,
                                    active: true,
                                }});
                            base.fields = [
                                '{{namespace[phewas]}}id', '{{namespace[phewas]}}log_pvalue',
                                '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue', '{{namespace[phewas]}}study',
                                '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                                '{{namespace[phewas]}}beta', '{{namespace[phewas]}}stderr_beta',
                                '{{namespace[phewas]}}tss_distance', '{{namespace[phewas]}}tss_position',
                                '{{namespace[phewas]}}top_value_rank',
                                '{{namespace[phewas]}}chromosome', '{{namespace[phewas]}}position',
                                '{{namespace[phewas]}}ref_allele', '{{namespace[phewas]}}alt_allele',
                                '{{namespace[phewas]}}maf', '{{namespace[phewas]}}samples',
                                '{{namespace[phewas]}}cs_index', '{{namespace[phewas]}}cs_size',
                                '{{namespace[phewas]}}pip', '{{namespace[phewas]}}pip|pip_yvalue',
                                '{{namespace[phewas]}}study', '{{namespace[phewas]}}molecular_trait_id',
                                '{{namespace[phewas]}}studytissue',
                            ];
                            base.x_axis.category_field = '{{namespace[phewas]}}symbol';
                            base.y_axis.field = '{{namespace[phewas]}}log_pvalue';
                            // We changed category_order_field from tss_distance to tss_position
                            // due to a recoding of tss_distance to incorporate direction as a sign
                            // which caused it to sort incorrectly in single variant view,
                            // when we choose "gene" as the x-axis grouping category
                            base.x_axis.category_order_field = 'phewas:tss_position';
                            base.y_axis.min_extent = [0, 8];

                            base.legend = [
                                {
                                    shape: 'circle',
                                    size: 40,
                                    label: 'Non-significant effect',
                                    class: 'lz-data_layer-scatter',
                                },
                                {
                                    shape: 'triangle',
                                    size: 40,
                                    label: 'Positive effect',
                                    class: 'lz-data_layer-scatter',
                                },
                                {
                                    shape: 'triangledown',
                                    size: 40,
                                    label: 'Negative effect',
                                    class: 'lz-data_layer-scatter',
                                },
                            ];

                            base.color = [
                                {
                                    field: 'lz_is_match', // Special field name whose presence triggers custom rendering
                                    scale_function: 'if',
                                    parameters: {
                                        field_value: true,
                                        then: '#ED180A',
                                    },
                                },
                                {
                                    field: 'lz_is_match', // Special field name whose presence triggers custom rendering
                                    scale_function: 'if',
                                    parameters: {
                                        field_value: false,
                                        then: '#EAE6E6',
                                    },
                                },
                                {
                                    field: '{{namespace[phewas]}}symbol',
                                    scale_function: 'categorical_bin',
                                    parameters: {
                                        categories: [],
                                        values: [],
                                        null_value: '#B8B8B8',
                                    },
                                },
                            ];
                            base.point_shape = [
                                {
                                    scale_function: 'effect_direction',
                                    parameters: {
                                        '+': 'triangle',
                                        '-': 'triangledown',
                                    },
                                },
                                'circle',
                            ];

                            // added molecular_trait_id as Transcript information as a tooltip
                            // TODO: only show this if using Txrevise data (datatype == 'txrev')
                            base.tooltip.html = `
<a href='/region/?position={{{{namespace[phewas]}}position|urlencode}}&chrom={{{{namespace[phewas]}}chromosome|urlencode}}&gene_id={{{{namespace[phewas]}}gene_id|urlencode}}&tissue={{{{namespace[phewas]}}tissue|urlencode}}&study={{{{namespace[phewas]}}study|urlencode}}'>See eQTL region plot for <i>{{{{namespace[phewas]}}symbol}}</i> x {{{{namespace[phewas]}}tissue}}</a><br>
Variant: <strong>{{{{namespace[phewas]}}chromosome|htmlescape}}:{{{{namespace[phewas]}}position|htmlescape}} {{{{namespace[phewas]}}ref_allele|htmlescape}}/{{{{namespace[phewas]}}alt_allele|htmlescape}}</strong><br>
Study: <strong>{{{{namespace[phewas]}}study|htmlescape}}</strong><br>
Gene ID: <strong>{{{{namespace[phewas]}}gene_id|htmlescape}}</strong><br>
Gene name: <strong><i>{{{{namespace[phewas]}}symbol|htmlescape}}</i></strong><br>
Tissue (sample size): <strong>{{{{namespace[phewas]}}tissue|htmlescape}} ({{{{namespace[phewas]}}samples|htmlescape}})</strong><br>
-Log10(P-value): <strong>{{{{namespace[phewas]}}log_pvalue|twosigfigs|htmlescape}}</strong><br>
Effect Size (SE): <strong>{{{{namespace[phewas]}}beta|twosigfigs|htmlescape}} ({{{{namespace[phewas]}}stderr_beta|twosigfigs|htmlescape}})</strong><br>
MAF: <strong>{{{{namespace[phewas]}}maf|twosigfigs|htmlescape}}</strong><br>
TSS distance: <strong>{{{{namespace[phewas]}}tss_distance|htmlescape}}</strong><br>
System: <strong>{{{{namespace[phewas]}}system|htmlescape}}</strong><br>
PIP: <strong>{{{{namespace[phewas]}}pip|pip_display}}</strong><br>
Credible set label: <strong>{{{{namespace[phewas]}}cs_index}}</strong><br>
Size of credible set: <strong>{{{{namespace[phewas]}}cs_size}}</strong><br>
Transcript: <strong>{{{{namespace[phewas]}}molecular_trait_id}}<strong><br>
`;
                            base.match = {
                                send: '{{namespace[phewas]}}tissue',
                                receive: '{{namespace[phewas]}}tissue',
                            };
                            base.label.text = '{{{{namespace[phewas]}}tissue}}';
                            base.label.filters = [
                                { field: '{{namespace[phewas]}}log_pvalue', operator: '>=', value: 10 },
                                { field: '{{namespace[phewas]}}top_value_rank', operator: '<=', value: 5 },
                            ];
                            return base;
                        })()),
                        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                    ],
                });
                panel.axes.y1.label_offset = 38;
                return panel;
            })()),
            LocusZoom.Layouts.get('panel', 'genes', {
                unnamespaced: true,
                height: 150,
                min_height: 150,
                axes: {
                    x: {
                        label: `Chromosome ${chrom} (Mb)`,
                        label_offset: 32,
                        tick_format: 'region',
                        extent: 'state',
                    },
                },
                data_layers: [
                    ((() => {
                        const base = LocusZoom.Layouts.get('data_layer', 'genes_filtered', {
                            unnamespaced: true,
                        });
                        base.color = [
                            {
                                field: 'lz_is_match', // Special field name whose presence triggers custom rendering
                                scale_function: 'if',
                                parameters: {
                                    field_value: true,
                                    then: '#ED180A',
                                },
                            },
                        ];
                        base.match = {
                            send: '{{namespace[genes]}}gene_name',
                            receive: '{{namespace[genes]}}gene_name',
                        };
                        return base;
                    })()),
                    {
                        id: 'variant',
                        type: 'orthogonal_line',
                        orientation: 'vertical',
                        offset: pos,
                        style: {
                            stroke: '#FF3333',
                            'stroke-width': '2px',
                            'stroke-dasharray': '4px 4px',
                        },
                    },
                ],
            }),
        ],
    });
}

/**
 * Layout mutation function: Changes the variable used to generate groups for coloring purposes;
 *  also changes the labeling field. This function modifies the input layout: it has side effects
 * @param layout
 * @param thing
 */
export function groupByThing(layout, thing) {
    let point_label_field;
    const scatter_config = layout.panels[0].data_layers[0];
    delete scatter_config.x_axis.category_order_field;
    if (thing === 'tissue') {
        point_label_field = 'symbol';
    } else if (thing === 'symbol') {
    // label by gene name, but arrange those genes based on position
        point_label_field = 'studytissue';
        scatter_config.x_axis.category_order_field = 'phewas:tss_position';
    } else if (thing === 'system') {
        point_label_field = 'symbol';
    } else if (thing === 'study') {
        point_label_field = 'tissue';
    } else if (thing === 'studytissue') {
        point_label_field = 'symbol';
    } else {
        throw new Error('Unrecognized grouping field');
    }
    scatter_config.x_axis.category_field = `phewas:${thing}`;
    scatter_config.color[2].field = `phewas:${thing}`;
    scatter_config.label.text = `{{phewas:${point_label_field}}}`;
    // eslint-disable-next-line no-multi-assign
    scatter_config.match.send = scatter_config.match.receive = `phewas:${point_label_field}`;
}

/**
 * Plot + Layout mutation function: changes the field used for the y-axis.
 *
 * In the future parts of this could probably be computed to reduce amt of code
 * @param plot_layout
 * @param yfield
 */
export function switchY(plot_layout, yfield) {
    const phewas_panel = plot_layout.panels[0];
    const scatter_config = phewas_panel.data_layers[0];
    const signif_line_config = phewas_panel.data_layers[1];
    if (yfield === 'log_pvalue') {
        scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 10 };
        scatter_config.legend = [
            {
                shape: 'circle',
                size: 40,
                label: 'Non-significant effect',
                class: 'lz-data_layer-scatter',
            },
            { shape: 'triangle', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
            {
                shape: 'triangledown',
                size: 40,
                label: 'Negative effect',
                class: 'lz-data_layer-scatter',
            },
        ];
        delete scatter_config.y_axis.ceiling;
        delete phewas_panel.axes.y1.ticks;
        phewas_panel.legend.hidden = true;
        scatter_config.y_axis.field = 'phewas:log_pvalue';
        scatter_config.y_axis.floor = 0;
        scatter_config.y_axis.lower_buffer = 0;
        scatter_config.y_axis.min_extent = [0, 8];
        scatter_config.point_shape = [
            {
                scale_function: 'effect_direction',
                parameters: {
                    '+': 'triangle',
                    '-': 'triangledown',
                },
            },
            'circle',
        ];
        phewas_panel.axes.y1.label = '-log10 p-value';
        signif_line_config.offset = 7.301;
        signif_line_config.style = {
            stroke: '#D3D3D3',
            'stroke-width': '3px',
            'stroke-dasharray': '10px 10px',
        };
    } else if (yfield === 'beta') {
        scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 10 };
        scatter_config.legend = [
            {
                shape: 'circle',
                size: 40,
                label: 'Non-significant effect',
                class: 'lz-data_layer-scatter',
            },
            { shape: 'triangle', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
            {
                shape: 'triangledown',
                size: 40,
                label: 'Negative effect',
                class: 'lz-data_layer-scatter',
            },
        ];
        delete scatter_config.y_axis.floor;
        delete scatter_config.y_axis.min_extent;
        delete scatter_config.y_axis.ceiling;
        delete phewas_panel.axes.y1.ticks;
        phewas_panel.legend.hidden = true;
        scatter_config.y_axis.field = 'phewas:beta';
        phewas_panel.axes.y1.label = 'Normalized Effect Size (NES)';
        signif_line_config.offset = 0;
        scatter_config.point_shape = [
            {
                scale_function: 'effect_direction',
                parameters: {
                    '+': 'triangle',
                    '-': 'triangledown',
                },
            },
            'circle',
        ];
        signif_line_config.style = {
            stroke: 'gray',
            'stroke-width': '1px',
            'stroke-dasharray': '10px 0px',
        };
        scatter_config.y_axis.lower_buffer = 0.15;
    } else if (yfield === 'pip') {
        scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 0 };
        scatter_config.legend = [
            { shape: 'cross', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
            { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
            { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
        ];
        phewas_panel.legend.hidden = false;
        scatter_config.y_axis.field = 'phewas:pip|pip_yvalue';
        scatter_config.y_axis.floor = -4.1;
        scatter_config.y_axis.ceiling = 0.2;
        scatter_config.y_axis.lower_buffer = 0;
        scatter_config.point_shape = [
            { scale_function: 'pip_cluster' },
            'circle',
        ];
        phewas_panel.axes.y1.label = 'Posterior Inclusion Probability (PIP)';
        phewas_panel.axes.y1.ticks = [
            { position: 'left', text: '1', y: 0 },
            { position: 'left', text: '0.1', y: -1 },
            { position: 'left', text: '0.01', y: -2 },
            { position: 'left', text: '1e-3', y: -3 },
            { position: 'left', text: '≤1e-4', y: -4 },
        ];
        signif_line_config.offset = -1000;
    }
}

/**
 * Change how many labels are shown on the plot
 * @param plot_layout
 * @param {number} n The number of labels to be shown (max count, depending on other filters)
 */
export function setLabelCount(plot_layout, n) {
    plot_layout.panels[0].data_layers[0].label.filters[1].value = n;
}

// Tabulator formatting helpers
function two_digit_fmt1(cell) {
    const x = cell.getValue();
    const d = -Math.floor(Math.log10(Math.abs(x)));
    return (d < 6) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
}

function two_digit_fmt2(cell) {
    const x = cell.getValue();
    const d = -Math.floor(Math.log10(Math.abs(x)));
    return (d < 4) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
}

function pip_fmt(cell) {
    const x = cell.getValue();
    if (x === 0) {
        return '-';
    }
    return x.toPrecision(2);
}

// function pip_cluster_fmt(cell) {
//     const x = cell.getValue();
//     if (x === 0) {
//         return '-';
//     }
//     return x.toFixed(0);
// }

export function tabulator_tooltip_maker(cell) {
    // Only show tooltips when an ellipsis ('...') is hiding part of the data.
    // When `element.scrollWidth` is bigger than `element.clientWidth`, that means that data is hidden.
    // Unfortunately the ellipsis sometimes activates when it's not needed, hiding data while `clientWidth == scrollWidth`.
    // Fortunately, these tooltips are just a convenience so it's fine if they fail to show.
    const e = cell.getElement();
    if (e.clientWidth >= e.scrollWidth) {
        return false; // all the text is shown, so there is no '...', so tooltip is unneeded
    }
    return e.innerText; // shows what's in the HTML (from `formatter`) instead of just `cell.getValue()`
}

export const VARIANT_TABLE_BASE_COLUMNS = [
    {   title: 'Gene',
        field: 'symbol',
        headerFilter: true,
        formatter: 'link',  // Links from single variant view to a region view plot by using the chromosome, gene, and tissue
        formatterParams: {  // FIX: display the label as italicized (will need to convert formatter to 'html' instead of 'link')
            // label: (cell) => `${cell.getValue()} (${cell.getData().gene_id})`,
            url: (cell) => {
                const data = cell.getRow().getData();
                return `/region?chrom=${data.chromosome}&gene_id=${data.gene_id}&tissue=${data.tissue}&study=${data.study}`;
            },
        }},
    { title: 'Study', field: 'study', headerFilter: true },
    { title: 'Tissue', field: 'tissue', headerFilter: true },
    { title: 'System', field: 'system', headerFilter: true },
    {
        title: '-log<sub>10</sub>(p)',
        field: 'log_pvalue',
        formatter: two_digit_fmt2,
        sorter: 'number',
    },
    { title: 'Effect Size', field: 'beta', formatter: two_digit_fmt1, sorter: 'number' },
    { title: 'SE (Effect Size)', field: 'stderr_beta', formatter: two_digit_fmt1 },
    { title: 'PIP', field: 'pip', formatter: pip_fmt },
    { title: 'CS Label', field: 'cs_index' },
    { title: 'CS Size', field: 'cs_size' },
];

export const REGION_TABLE_BASE_COLUMNS = [
    {
        title: 'Variant', field: 'variant_id', formatter: 'link',
        sorter(a, b, aRow, bRow, column, dir, sorterParams) {
            // Sort by chromosome, then position
            const a_data = aRow.getData();
            const b_data = bRow.getData();
            return (a_data.chromosome).localeCompare(b_data.chromosome, undefined, {numeric: true})
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
    // We have temporarily removed log P-values from the table
    // because appropriate P-value are not part of the credible_sets database
    // from which we pull the data displayed for the table
    // Possible future work: Add P-values back in by joining P-values from the raw data
    // {
    //     title: '-log<sub>10</sub>(p)',
    //     field: 'log_pvalue',
    //     formatter: two_digit_fmt2,
    //     sorter: 'number',
    // },
    // { title: 'Effect Size', field: 'beta', formatter: two_digit_fmt1, sorter: 'number' },
    // { title: 'SE (Effect Size)', field: 'stderr_beta', formatter: two_digit_fmt1 },
    { title: 'PIP', field: 'pip', formatter: pip_fmt, sorter: 'number' },
    { title: 'CS Label', field: 'cs_index' },
    { title: 'CS Size', field: 'cs_size' },
];
