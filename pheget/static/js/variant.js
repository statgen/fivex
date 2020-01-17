// This section will define the code required for the plot
/* global LocusZoom */
/* global Tabulator */

LocusZoom.TransformationFunctions.set('pip_yvalue', function (x) {return Math.max(Math.log10(x), -6);});

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL(state, chain) {
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        chain.header.maximum_tss_distance = state.maximum_tss_distance;
        chain.header.minimum_tss_distance = state.minimum_tss_distance;
        chain.header.y_field = state.y_field;
        return this.url;
    },
    annotateData(records, chain) {
        records = records.filter(function (record) {
            return record.tss_distance <= chain.header.maximum_tss_distance && record.tss_distance >= chain.header.minimum_tss_distance;
        });
        // Add a synthetic field `top_value_rank`, where the best value for a given field gets rank 1.
        // This is used to show labels for only a few points with the strongest (y_field) value.
        // As this is a source designed to power functionality on one specific page, we can hardcode specific behavior
        //   to rank individual fields differently

        // To make it, sort a shallow copy of `records` by `y_field`, and then iterate through the shallow copy, modifying each record object.
        // Because it's a shallow copy, the record objects in the original array are changed too.
        const field = chain.header.y_field;
        function getValue(item) {
            if (field === 'log_pvalue') {
                return item[field];
            } else if (field === 'beta') {
                return Math.abs(item[field]);
            } else if (field === 'pip') {
                return item[field];
            } else {
                throw new Error('Unrecognized sort field');
            }
        }

        var shallow_copy = records.slice();
        shallow_copy.sort(function (a, b) {
            var av = getValue(a);
            var bv = getValue(b);
            return (av === bv) ? 0 : (av < bv ? 1 : -1);  // log: descending order means most significant first
        });
        shallow_copy.forEach(function (value, index) {
            value['top_value_rank'] = index + 1;
        });
        return records;
    }
});

/**
 * A special modified datalayer, which sorts points in a unique way (descending), and allows tick marks to be defined
 *   separate from how things are grouped. Eg, we can sort by tss_distance, but label by gene name
 */
LocusZoom.DataLayers.extend('category_scatter', 'category_scatter', {
    // Redefine the layout, in order to preserve CSS rules (which incorporate the name of the layer)
    _prepareData: function () {
        var xField = this.layout.x_axis.field || 'x';
        // The (namespaced) field from `this.data` that will be used to assign datapoints to a given category & color
        var category_field = this.layout.x_axis.category_field;
        if (!category_field) {
            throw new Error('Layout for ' + this.layout.id + ' must specify category_field');
        }

        // Element labels don't have to match the sorting field used to create groups. However, we enforce a rule that
        //  there must be a 1:1 correspondence
        // If two points have the same value of `category_field`, they MUST have the same value of `category_label_field`.
        var sourceData;
        var category_order_field = this.layout.x_axis.category_order_field;
        if (category_order_field) {
            var unique_categories = {};
            // Requirement: there is (approximately) a 1:1 correspondence between categories and their associated labels
            this.data.forEach(function (d) {
                var item_cat_label = d[category_field];
                var item_cat_order = d[category_order_field];
                if (!Object.prototype.hasOwnProperty.call(unique_categories, item_cat_label)) {
                    unique_categories[item_cat_label] = item_cat_order;
                } else if (unique_categories[item_cat_label] !== item_cat_order) {
                    throw new Error('Unable to sort PheWAS plot categories by ' + category_field + ' because the category ' + item_cat_label
                        + ' can have either the value "' + unique_categories[item_cat_label] + '" or "' + item_cat_order + '".');
                }
            });

            // Sort the data so that things in the same category are adjacent
            sourceData = this.data
                .sort(function (a, b) {
                    var av = -a[category_order_field]; // sort descending
                    var bv = -b[category_order_field];
                    return (av === bv) ? 0 : (av < bv ? -1 : 1);
                });
        } else {
            // Sort the data so that things in the same category are adjacent (case-insensitive by specified field)
            sourceData = this.data
                .sort(function (a, b) {
                    var ak = a[category_field];
                    var bk = b[category_field];
                    var av = ak.toString ? ak.toString().toLowerCase() : ak;
                    var bv = bk.toString ? bk.toString().toLowerCase() : bk;
                    return (av === bv) ? 0 : (av < bv ? -1 : 1);
                });
        }

        sourceData.forEach(function (d, i) {
            // Implementation detail: Scatter plot requires specifying an x-axis value, and most datasources do not
            //   specify plotting positions. If a point is missing this field, fill in a synthetic value.
            d[xField] = d[xField] || i;
        });
        return sourceData;
    }
});

LocusZoom.ScaleFunctions.add('pip_cluster', function (parameters, input) {
    if (typeof input !== 'undefined') {
        var pip_cluster = input['phewas:cluster'];
        if (pip_cluster === 1) {
            return 'diamond';
        }
        if (pip_cluster === 2) {
            return 'square';
        }
        if (pip_cluster === 3) {
            return 'triangle-up';
        }
        if (pip_cluster >= 4) {
            return 'cross';
        }
    }
    return null;
});

LocusZoom.ScaleFunctions.add('effect_direction', function (parameters, input) {
    if (typeof input !== 'undefined') {
        var beta = input['phewas:beta'];
        var stderr_beta = input['phewas:stderr_beta'];
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

LocusZoom.TransformationFunctions.add('twosigfigs', function(x) {
    return (Math.abs(x) >= .1) ? x.toFixed(2) : (Math.abs(x) >= .01) ? x.toFixed(3) : x.toExponential(1);
});


// eslint-disable-next-line no-unused-vars
function makePhewasPlot(chrom, pos, selector) {  // add a parameter geneid
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    pos = +pos;
    var pos_lower = pos - 500000;
    var pos_higher = pos + 500000;
    dataSources
        .add('phewas', ['PheGET', {
            url: `/api/variant/${chrom}_${pos}/`,
        }])
        .add('gene', ['GeneLZ', { url: apiBase + 'annotation/genes/', params: { build: 'GRCh38' } }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);

    // Allow the URL to change as the user selects interactive options
    const stateUrlMapping = {minimum_tss_distance: 'minimum_tss_distance', maximum_tss_distance: 'maximum_tss_distance'};
    let initialState = LocusZoom.ext.DynamicUrls.paramsFromUrl(stateUrlMapping);

    initialState = Object.assign({
        variant: `${chrom}:${pos}`,
        start: pos_lower,
        end: pos_higher,
        chr: chrom,
        y_field: 'log_pvalue',
        minimum_tss_distance: -1000000,
        maximum_tss_distance: 1000000,
        position: pos,
    }, initialState);

    // The backend guarantees that these params will be part of the URL on pageload
    var layout = LocusZoom.Layouts.get('plot', 'standard_phewas', {
        responsive_resize: 'width_only',
        state: initialState,
        dashboard: {
            components: [
                {
                    color: 'gray',
                    position: 'right',
                    type: 'download'
                },

            ]
        },
        panels: [
            function() {
                const panel = LocusZoom.Layouts.get('panel', 'phewas', {
                    unnamespaced: true,
                    min_height: 500,
                    dashboard: {
                        components: [
                            {
                                color: 'gray',
                                position: 'right',
                                type: 'toggle_legend'
                            }
                        ]
                    },
                    legend: {
                        orientation: 'vertical',
                        origin: { x: 55, y: 30 },
                        hidden: true
                    },
                    data_layers: [
                        function () {
                            const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
                            // TODO: Peter remembers a bug involving LD-refvar; Y-axis transform that is not in the fields array
                            base.fields = [
                                '{{namespace[phewas]}}id', '{{namespace[phewas]}}log_pvalue',
                                '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                                '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                                '{{namespace[phewas]}}beta', '{{namespace[phewas]}}stderr_beta',
                                '{{namespace[phewas]}}tss_distance',
                                '{{namespace[phewas]}}top_value_rank',
                                '{{namespace[phewas]}}chromosome', '{{namespace[phewas]}}position',
                                '{{namespace[phewas]}}ref_allele', '{{namespace[phewas]}}alt_allele',

                                '{{namespace[phewas]}}ma_samples', '{{namespace[phewas]}}ma_count',
                                '{{namespace[phewas]}}maf', '{{namespace[phewas]}}samples',
                                '{{namespace[phewas]}}cluster', '{{namespace[phewas]}}spip',
                                '{{namespace[phewas]}}pip', '{{namespace[phewas]}}pip|pip_yvalue',
                            ];
                            base.x_axis.category_field = '{{namespace[phewas]}}symbol';
                            base.y_axis.field = '{{namespace[phewas]}}log_pvalue';
                            base.x_axis.category_order_field = 'phewas:tss_distance';
                            base.y_axis.min_extent = [0, 8];

                            base.legend = [
                                { shape: 'circle', size: 40, label: 'Non-significant effect', class: 'lz-data_layer-scatter' },
                                { shape: 'triangle-up', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
                                { shape: 'triangle-down', size: 40, label: 'Negative effect', class: 'lz-data_layer-scatter' },
                            ];

                            base.color = [
                                {
                                    field: 'lz_highlight_match',  // Special field name whose presence triggers custom rendering
                                    scale_function: 'if',
                                    parameters: {
                                        field_value: true,
                                        then: '#ED180A'
                                    },
                                },
                                {
                                    field: 'lz_highlight_match',  // Special field name whose presence triggers custom rendering
                                    scale_function: 'if',
                                    parameters: {
                                        field_value: false,
                                        then: '#EAE6E6'
                                    },
                                },
                                {
                                    field: '{{namespace[phewas]}}symbol',
                                    scale_function: 'categorical_bin',
                                    parameters: {
                                        categories: [],
                                        values: [],
                                        null_value: '#B8B8B8'
                                    }
                                }
                            ];
                            base.point_shape = [
                                {
                                    scale_function: 'effect_direction',
                                    parameters: {
                                        '+': 'triangle-up',
                                        '-': 'triangle-down'
                                    }
                                },
                                'circle'
                            ];

                            base.tooltip.html = `
<strong>Variant:</strong> {{{{namespace[phewas]}}chromosome|htmlescape}}:{{{{namespace[phewas]}}position|htmlescape}} {{{{namespace[phewas]}}ref_allele|htmlescape}}/{{{{namespace[phewas]}}alt_allele|htmlescape}}<br>
<strong>Gene ID:</strong> {{{{namespace[phewas]}}gene_id|htmlescape}}<br>
<strong>Gene name:</strong> <i>{{{{namespace[phewas]}}symbol|htmlescape}}</i><br>
<strong>Tissue (sample size):</strong> {{{{namespace[phewas]}}tissue|htmlescape}} ({{{{namespace[phewas]}}samples|htmlescape}})<br>
<strong>-Log10(P-value):</strong> {{{{namespace[phewas]}}log_pvalue|twosigfigs|htmlescape}}<br>
<strong>NES (SE):</strong> {{{{namespace[phewas]}}beta|twosigfigs|htmlescape}} ({{{{namespace[phewas]}}stderr_beta|twosigfigs|htmlescape}})<br>
<strong>MAF:</strong> {{{{namespace[phewas]}}maf|twosigfigs|htmlescape}}<br>
<strong>TSS distance:</strong> {{{{namespace[phewas]}}tss_distance|htmlescape}}<br>
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>
<strong>PIP:</strong> {{{{namespace[phewas]}}pip}}<br>
<strong>SPIP:</strong> {{{{namespace[phewas]}}spip}}<br>
<strong>PIP cluster:</strong> {{{{namespace[phewas]}}cluster}}<br>
<form action="/region/" method="get">
    <input name="chrom" type="hidden" value='{{{{namespace[phewas]}}chromosome}}'>
    <input name="position" type="hidden" value='{{{{namespace[phewas]}}position}}'>
    <input name="gene_id" type="hidden" value='{{{{namespace[phewas]}}gene_id}}'>
    <input name="tissue" type="hidden" value='{{{{namespace[phewas]}}tissue}}'>
    <input type="submit" class="linkButton" value="See region plot for {{{{namespace[phewas]}}tissue|htmlescape}} x {{{{namespace[phewas]}}symbol|htmlescape}}"/>
</form>
`;
                            base.match = { send: '{{namespace[phewas]}}tissue', receive: '{{namespace[phewas]}}tissue' };
                            base.label.text = '{{{{namespace[phewas]}}tissue}}';
                            base.label.filters[0].field = '{{namespace[phewas]}}log_pvalue';
                            base.label.filters.push({ field: 'phewas:top_value_rank', operator: '<=', value: 5 });
                            return base;
                        }(),
                        // TODO: Must decide on an appropriate significance threshold for this use case
                        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                    ],
                });
                panel.axes.y1.label_offset = 38;
                return panel;
            }(),
            LocusZoom.Layouts.get('panel', 'genes', {
                unnamespaced: true,
                margin: { bottom: 40 },
                min_height: 150,
                axes: {
                    x: {
                        label: `Chromosome ${chrom} (Mb)`,
                        label_offset: 32,
                        tick_format: 'region',
                        extent: 'state'
                    }
                },
                data_layers: [
                    function () {
                        const base = LocusZoom.Layouts.get('data_layer', 'genes', {
                            unnamespaced: true,
                            exon_height: 8,
                            bounding_box_padding: 5,
                            track_vertical_spacing: 5,
                            exon_label_spacing: 3
                        });
                        base.color = [
                            {
                                field: 'lz_highlight_match',  // Special field name whose presence triggers custom rendering
                                scale_function: 'if',
                                parameters: {
                                    field_value: true,
                                    then: '#ED180A'
                                },
                            },
                        ];
                        base.match = {
                            send: '{{namespace[genes]}}gene_name',
                            receive: '{{namespace[genes]}}gene_name'
                        };
                        return base;
                    }(),
                    {
                        id: 'variant',
                        type: 'orthogonal_line',
                        orientation: 'vertical',
                        offset: pos,
                        style: {
                            'stroke': '#FF3333',
                            'stroke-width': '2px',
                            'stroke-dasharray': '4px 4px'
                        }
                    }
                ]
            })
        ]
    });

    // Generate the plot
    var plot = LocusZoom.populate(selector, dataSources, layout);

    // Changes in the plot can be reflected in the URL, and vice versa (eg browser back button can go back to
    //   a previously viewed region)
    LocusZoom.ext.DynamicUrls.plotUpdatesUrl(plot, stateUrlMapping);
    LocusZoom.ext.DynamicUrls.plotWatchesUrl(plot, stateUrlMapping);

    // Attach the current position as a state variable - used for resizing the gene track dynamically
    return [plot, dataSources];
}

// eslint-disable-next-line no-unused-vars
function makeTable(selector) {
    var two_digit_fmt1 = function (cell) {
        var x = cell.getValue();
        var d = -Math.floor(Math.log10(Math.abs(x)));
        return (d < 6) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
    };
    var two_digit_fmt2 = function (cell) {
        var x = cell.getValue();
        var d = -Math.floor(Math.log10(Math.abs(x)));
        return (d < 4) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
    };
    var pip_fmt = function (cell) {
        var x = cell.getValue();
        if (x === 0) {
            return '0';
        }
        return x.toPrecision(2);
    };
    var tabulator_tooltip_maker = function (cell) {
        // Only show tooltips when an ellipsis ('...') is hiding part of the data.
        // When `element.scrollWidth` is bigger than `element.clientWidth`, that means that data is hidden.
        // Unfortunately the ellipsis sometimes activates when it's not needed, hiding data while `clientWidth == scrollWidth`.
        // Fortunately, these tooltips are just a convenience so it's fine if they fail to show.
        var e = cell.getElement();
        if (e.clientWidth >= e.scrollWidth) {
            return false; // all the text is shown, so there is no '...', so tooltip is unneeded
        } else {
            return e.innerText; //shows what's in the HTML (from `formatter`) instead of just `cell.getValue()`
        }
    };

    return new Tabulator(selector, {
        pagination: 'local',
        paginationSize: 20,
        layout: 'fitData',
        columns: [
            {
                title: 'Gene', field: 'phewas:symbol', headerFilter: true, formatter: function (cell) {
                    return '<i>' + cell.getValue() + ' (' + cell.getData()['phewas:gene_id'] + '</i>)';
                }
            },
            { title: 'Tissue', field: 'phewas:tissue', headerFilter: true },
            { title: 'System', field: 'phewas:system', headerFilter: true },
            { title: '-log<sub>10</sub>(p)', field: 'phewas:log_pvalue', formatter: two_digit_fmt2, sorter: 'number' },
            // A large effect size in either direction is good, so sort by abs value
            { title: 'Effect Size', field: 'phewas:beta', formatter: two_digit_fmt1, sorter: 'number' },
            { title: 'SE (Effect Size)', field: 'phewas:stderr_beta', formatter: two_digit_fmt1 },
            { title: 'PIP', field: 'phewas:pip', formatter: pip_fmt },
        ],
        placeholder: 'No data available',
        initialSort: [{ column: 'phewas:log_pvalue', dir: 'desc' }],
        tooltipGenerationMode: 'hover',
        tooltips: tabulator_tooltip_maker,
        tooltipsHeader: true,
    });
}

// eslint-disable-next-line no-unused-vars
function updateTable(table, data) {
    table.setData(data);
}

// Changes the variable used to generate groups for coloring purposes; also changes the labeling field
// eslint-disable-next-line no-unused-vars
function groupByThing(plot, thing) {
    var group_field, point_label_field;
    const scatter_config = plot.layout.panels[0].data_layers[0];
    delete scatter_config.x_axis.category_order_field;
    if (thing === 'tissue') {
        group_field = 'tissue';
        point_label_field = 'symbol';
    } else if (thing === 'symbol') {
        group_field = 'symbol';  // label by gene name, but arrange those genes based on position
        point_label_field = 'tissue';
        scatter_config.x_axis.category_order_field = 'phewas:tss_distance';
    } else if (thing === 'system') {
        group_field = 'system';
        point_label_field = 'symbol';
    } else {
        throw new Error('Unrecognized grouping field');
    }
    scatter_config.x_axis.category_field = `phewas:${group_field}`;
    scatter_config.color[2].field = `phewas:${group_field}`;
    scatter_config.label.text = `{{phewas:${point_label_field}}}`;
    scatter_config.match.send = scatter_config.match.receive = `phewas:${point_label_field}`;

    plot.applyState();
}

// Switches the displayed y-axis value between p-values and effect size
// eslint-disable-next-line no-unused-vars
function switchY(plot, table, yfield) {
    const scatter_config = plot.layout.panels[0].data_layers[0];
    if (yfield === 'log_pvalue') {
        scatter_config.legend = [
            { shape: 'circle', size: 40, label: 'Non-significant effect', class: 'lz-data_layer-scatter' },
            { shape: 'triangle-up', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
            { shape: 'triangle-down', size: 40, label: 'Negative effect', class: 'lz-data_layer-scatter' },
        ];
        delete scatter_config.y_axis.ceiling;
        delete plot.layout.panels[0].axes.y1.ticks;
        plot.panels.phewas.legend.layout.hidden = true;
        plot.panels.phewas.legend.render();
        scatter_config.y_axis.field = 'phewas:log_pvalue';
        scatter_config.y_axis.floor = 0;
        scatter_config.y_axis.lower_buffer = 0;
        scatter_config.y_axis.min_extent = [0, 8];
        scatter_config.point_shape = [
            {
                scale_function: 'effect_direction',
                parameters: {
                    '+': 'triangle-up',
                    '-': 'triangle-down'
                }
            },
            'circle'
        ];
        plot.layout.panels[0].axes.y1['label'] = '-log 10 p-value';
        plot.layout.panels[0].data_layers[1].offset = 7.301;
        plot.layout.panels[0].data_layers[1].style = {
            'stroke': '#D3D3D3',
            'stroke-width': '3px',
            'stroke-dasharray': '10px 10px'
        };

        table.setSort('phewas:log_pvalue', 'desc');
    } else if (yfield === 'beta') {
        scatter_config.legend = [
            { shape: 'circle', size: 40, label: 'Non-significant effect', class: 'lz-data_layer-scatter' },
            { shape: 'triangle-up', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
            { shape: 'triangle-down', size: 40, label: 'Negative effect', class: 'lz-data_layer-scatter' },
        ];
        delete scatter_config.y_axis.floor;
        delete scatter_config.y_axis.min_extent;
        delete scatter_config.y_axis.ceiling;
        delete plot.layout.panels[0].axes.y1.ticks;
        plot.panels.phewas.legend.layout.hidden = true;
        plot.panels.phewas.legend.render();
        scatter_config.y_axis.field = 'phewas:beta';
        plot.layout.panels[0].axes.y1['label'] = 'Normalized Effect Size (NES)';
        plot.layout.panels[0].data_layers[1].offset = 0;
        scatter_config.point_shape = [
            {
                scale_function: 'effect_direction',
                parameters: {
                    '+': 'triangle-up',
                    '-': 'triangle-down'
                }
            },
            'circle'
        ];
        plot.layout.panels[0].data_layers[1].style = {
            'stroke': 'gray',
            'stroke-width': '1px',
            'stroke-dasharray': '10px 0px'
        };
        scatter_config.y_axis.lower_buffer = 0.15;

        table.setSort('phewas:beta', 'desc');
    } else if (yfield === 'pip') {
        scatter_config.legend = [
            { shape: 'diamond', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
            { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
            { shape: 'triangle-up', size: 40, label: 'Cluster 3', class: 'lz-data_layer-scatter' },
            { shape: 'cross', size: 40, label: 'Cluster 4+', class: 'lz-data_layer-scatter' },
            { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
        ];
        plot.panels.phewas.legend.layout.hidden = false;
        plot.panels.phewas.legend.render();
        scatter_config.y_axis.field = 'phewas:pip|pip_yvalue';
        scatter_config.y_axis.floor = -6.1;
        scatter_config.y_axis.ceiling = 0.2;
        scatter_config.y_axis.lower_buffer = 0;
        // scatter_config.y_axis.upper_buffer = 0.1;
        // scatter_config.y_axis.min_extent = [0, 1];
        scatter_config.point_shape = [
            {
                scale_function: 'pip_cluster',
            },
            'circle'
        ];
        plot.layout.panels[0].axes.y1.label = 'Posterior Inclusion Probability (PIP)';
        plot.layout.panels[0].axes.y1.ticks = [
            {position: 'left', text: '1', y: 0},
            {position: 'left', text: '0.1', y: -1},
            {position: 'left', text: '0.01', y: -2},
            {position: 'left', text: '1e-3', y: -3},
            {position: 'left', text: '1e-4', y: -4},
            {position: 'left', text: '1e-5', y: -5},
            {position: 'left', text: '≤1e-6', y: -6}
        ];
        plot.layout.panels[0].data_layers[1].offset = -1000;


        table.setSort('phewas:pip', 'desc');
    }
    plot.applyState({ y_field: yfield });
}

// Changes the number of top variants which are labeled on the plot
// eslint-disable-next-line no-unused-vars
function labelTopVariants(plot, topVariantsToShow) {
    plot.layout.panels[0].data_layers[0].label.filters[1].value = topVariantsToShow;
    plot.applyState();
}
