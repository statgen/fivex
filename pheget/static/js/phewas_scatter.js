// This section will define the code required for the plot
/* global d3 */
/* global LocusZoom */
/* global Tabulator */

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    },
    annotateData(records) {
        // Add a synthetic field `pvalue_rank`, where the strongest pvalue gets rank 1.
        // `pvalue_rank` is used to show labels for only a few points with the strongest p-values.
        // To make it, sort a shallow copy of `records` by pvalue, and then iterate through the shallow copy, modifying each record object.
        // Because it's a shallow copy, the record objects in the original array are changed too.
        var sort_field = 'log_pvalue';
        var shallow_copy = records.slice();
        shallow_copy.sort(function(a, b) {
            var av = a[sort_field];
            var bv = b[sort_field];
            return (av === bv) ? 0 : (av < bv ? 1 : -1);  // log: descending order means most significant first
        });
        shallow_copy.forEach(function(value, index) { value['log_pvalue_rank'] = 1 + index; });
        return records;
    }
});

/**
 * A special modified datalayer, which sorts points in a unique way (descending), and allows tick marks to be defined
 *   separate from how things are grouped. Eg, we can sort by tss_distance, but label by gene name
 */
LocusZoom.DataLayers.extend('category_scatter', 'category_scatter', {
    // Redefine the layout, in order to preserve CSS rules (which incorporate the name of the layer)
    _prepareData: function() {
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
            this.data.forEach(function(d) {
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
                .sort(function(a, b) {
                    var av = -a[category_order_field]; // sort descending
                    var bv = -b[category_order_field];
                    return (av === bv) ? 0 : (av < bv ? -1 : 1);});
        } else {
            // Sort the data so that things in the same category are adjacent (case-insensitive by specified field)
            sourceData = this.data
                .sort(function(a, b) {
                    var ak = a[category_field];
                    var bk = b[category_field];
                    var av = ak.toString ? ak.toString().toLowerCase() : ak;
                    var bv = bk.toString ? bk.toString().toLowerCase() : bk;
                    return (av === bv) ? 0 : (av < bv ? -1 : 1);});
        }

        sourceData.forEach(function(d, i) {
            // Implementation detail: Scatter plot requires specifying an x-axis value, and most datasources do not
            //   specify plotting positions. If a point is missing this field, fill in a synthetic value.
            d[xField] = d[xField] || i;
        });
        return sourceData;
    }
});

LocusZoom.ScaleFunctions.add('effect_direction', function(parameters, input) {
    if (typeof input !== 'undefined') {
        var beta = input['phewas:beta'];
        var stderr_beta = input['phewas:stderr_beta'];
        if (!isNaN(beta) && !isNaN(stderr_beta)) {
            if (beta - 1.96 * stderr_beta > 0) { return parameters['+'] || null; } // 1.96*se to find 95% confidence interval
            if (beta + 1.96 * stderr_beta < 0) { return parameters['-'] || null; }
        }
    }
    return null;
});

// Redefine the `resize_to_data` button to set the text to "Show All Genes" (and no other changes).
// Delete this once LocusZoom allows configuring the text via the layout.
LocusZoom.Dashboard.Components.set('resize_to_data', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color).setHtml('Show All Genes')
            .setTitle('Automatically resize this panel to fit the data its currently showing')
            .setOnclick(function() {
                this.parent_panel.scaleHeightToData();
                this.update();
            }.bind(this));
        this.button.show();
        return this;
    };
});


// Redefine the orthogonal line element from locuszoom/assets/js/app/DataLayers/line.js so we can make it draw all the way down
LocusZoom.DataLayers.add('orthogonal_line_varpos', function(layout) {
    // Define a default layout for this DataLayer type and merge it with the passed argument
    this.DefaultLayout = {
        style: {
            'stroke': '#FF3333',
            'stroke-width': '2px',
            'stroke-dasharray': '4px 4px'
        },
        orientation: 'vertical',
        x_axis: {
            axis: 1,
            decoupled: true
        },
        y_axis: {
            axis: 1,
            decoupled: true
        },
        offset: 0
    };
    layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);

    // Require that orientation be "horizontal" or "vertical" only
    if (['horizontal', 'vertical'].indexOf(layout.orientation) === -1) {
        layout.orientation = 'vertical';
    }

    // Vars for storing the data generated line
    /** @member {Array} */
    this.data = [];
    /** @member {d3.svg.line} */
    this.line = null;

    // Apply the arguments to set LocusZoom.DataLayer as the prototype
    LocusZoom.DataLayer.apply(this, arguments);

    /**
     * Implement the main render function
     */
    this.render = function() {

        // Several vars needed to be in scope
        var panel = this.parent;
        var x_scale = 'x_scale';
        var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
        var y_extent = 'y' + this.layout.y_axis.axis + '_extent';
        var x_range = 'x_range';
        var y_range = 'y' + this.layout.y_axis.axis + '_range';

        // Generate data using extents - use two points, but with NaNs in the y-axis
        this.data = [
            { x: this.layout.offset, y: panel[y_extent][0] },  // panel[y1_extent][0] = NaN
            { x: this.layout.offset, y: panel[y_extent][1] }   // panel[y1_extent][1] = NaN
        ];

        // Join data to the line selection
        var selection = this.svg.group
            .selectAll('path.lz-data_layer-line')
            .data([this.data]);

        // Create path element, apply class
        this.path = selection.enter()
            .append('path')
            .attr('class', 'lz-data_layer-line');

        panel[y_range][0] = panel.layout.height;  // Forcibly extract the height of this panel and set it as the height of this line (see below)

        // Generate the line
        this.line = d3.svg.line()
            .x(function(d, i) {
                var x = parseFloat(panel[x_scale](d['x']));
                return isNaN(x) ? panel[x_range][i] : x;
            })
            .y(function(d, i) {
                var y = parseFloat(panel[y_scale](d['y']));
                return isNaN(y) ? panel[y_range][i] : y;  // This will use the forcibly-changed height value
            })
            .interpolate('linear');

        // Apply line and style
        if (this.canTransition()) {
            selection
                .transition()
                .duration(this.layout.transition.duration || 0)
                .ease(this.layout.transition.ease || 'cubic-in-out')
                .attr('d', this.line)
                .style(this.layout.style);
        } else {
            selection
                .attr('d', this.line)
                .style(this.layout.style);
        }
        selection.exit().remove();
    };

    return this;

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

    var layout = LocusZoom.Layouts.get('plot', 'standard_phewas', {
        responsive_resize: 'width_only',
        state: {
            variant: `${chrom}:${pos}`,
            start: pos_lower,
            end: pos_higher,
            chr: chrom
        },
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
            LocusZoom.Layouts.get('panel', 'phewas', {
                unnamespaced: true,
                min_height: 500,
                data_layers: [
                    function () {
                        const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
                        base.fields = [
                            '{{namespace[phewas]}}id', '{{namespace[phewas]}}log_pvalue',
                            '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                            '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                            '{{namespace[phewas]}}beta', '{{namespace[phewas]}}stderr_beta',
                            '{{namespace[phewas]}}tss_distance',
                            '{{namespace[phewas]}}log_pvalue_rank',
                            '{{namespace[phewas]}}chromosome', '{{namespace[phewas]}}position',
                            '{{namespace[phewas]}}ref_allele', '{{namespace[phewas]}}altAllele',

                            '{{namespace[phewas]}}ma_samples', '{{namespace[phewas]}}ma_count',
                            '{{namespace[phewas]}}maf', '{{namespace[phewas]}}samples',
                        ];
                        base.x_axis.category_field = '{{namespace[phewas]}}symbol';
                        base.y_axis.field = '{{namespace[phewas]}}log_pvalue';
                        base.x_axis.category_order_field = 'phewas:tss_distance';

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
<strong>Variant:</strong> {{{{namespace[phewas]}}chromosome|htmlescape}}:{{{{namespace[phewas]}}position|htmlescape}} {{{{namespace[phewas]}}refAllele|htmlescape}}/{{{{namespace[phewas]}}altAllele|htmlescape}}<br>
<strong>Gene ID:</strong> {{{{namespace[phewas]}}gene_id|htmlescape}}<br>
<strong>Gene name:</strong> {{{{namespace[phewas]}}symbol|htmlescape}}<br>
<strong>TSS distance:</strong> {{{{namespace[phewas]}}tss_distance|htmlescape}}<br>
<strong>MAF:</strong> {{{{namespace[phewas]}}maf|htmlescape}}<br>
<strong>-Log10(P-value):</strong> {{{{namespace[phewas]}}log_pvalue|htmlescape}}<br>

<strong>NES (SE):</strong> {{{{namespace[phewas]}}beta|htmlescape}} ({{{{namespace[phewas]}}stderr_beta|htmlescape}})<br>
<strong>Tissue (sample size):</strong> {{{{namespace[phewas]}}tissue|htmlescape}} ({{{{namespace[phewas]}}samples|htmlescape}})<br>
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>
<form action="/singlegene" method="get">
    <input name="chrom" type="hidden" value='{{{{namespace[phewas]}}chromosome}}'>
    <input name="pos" type="hidden" value='{{{{namespace[phewas]}}position}}'>
    <input name="gene_id" type="hidden" value='{{{{namespace[phewas]}}gene_id}}'>
    <input name="tissue" type="hidden" value='{{{{namespace[phewas]}}tissue}}'>
    <input type="submit" class="linkButton" value="Search this gene"/>
</form>`;
                        base.match = { send: '{{namespace[phewas]}}tissue', receive: '{{namespace[phewas]}}tissue' };
                        base.label.text = '{{{{namespace[phewas]}}tissue}}';
                        base.label.filters[0].field = '{{namespace[phewas]}}log_pvalue';
                        base.label.filters.push({ field: 'phewas:log_pvalue_rank', operator: '<=', value: 5 });
                        return base;
                    }(),
                    // TODO: Must decide on an appropriate significance threshold for this use case
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                ],
            }),
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
                    function() {
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
                        base.match = { send: '{{namespace[genes]}}gene_name', receive: '{{namespace[genes]}}gene_name' };
                        return base;
                    }(),
                    {
                        id: 'variant',
                        type: 'orthogonal_line_varpos',
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

    return [plot, dataSources];
}

// eslint-disable-next-line no-unused-vars
function makeTable(selector) {
    var two_digit_fmt1 = function(cell) { var x = cell.getValue(); var d = -Math.floor(Math.log10(Math.abs(x))); return (d < 6) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1); };
    var two_digit_fmt2 = function(cell) { var x = cell.getValue(); var d = -Math.floor(Math.log10(Math.abs(x))); return (d < 4) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1); };
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
            {title: 'Gene', field: 'phewas:symbol', headerFilter: true, formatter: function(cell) {return '<i>' + cell.getValue() + ' (' + cell.getData()['phewas:gene_id'] + '</i>)';}},
            {title: 'Tissue', field: 'phewas:tissue', headerFilter: true},
            {title: 'System', field: 'phewas:system', headerFilter: true},
            {title: '-log<sub>10</sub>(p)', field: 'phewas:log_pvalue', formatter: two_digit_fmt2, sorter: 'number'},
            // A large effect size in either direction is good, so sort by abs value
            {title: 'Normalized Effect Size', field: 'phewas:beta', formatter: two_digit_fmt1, sorter: 'number'},
            {title: 'SE (Normalized Effect Size)', field: 'phewas:stderr_beta', formatter: two_digit_fmt1},
        ],
        placeholder: 'No data available',
        initialSort: [{column: 'phewas:log_pvalue', dir: 'desc'}],
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
        scatter_config.y_axis.field = 'phewas:log_pvalue';
        scatter_config.y_axis.floor = 0;
        scatter_config.y_axis.lower_buffer = 0;
        plot.layout.panels[0].data_layers[1].offset = 7.301;
        plot.layout.panels[0].data_layers[1].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};

        table.setSort('phewas:log_pvalue', 'desc');
    } else if (yfield === 'beta') {
        delete scatter_config.y_axis.floor;
        scatter_config.y_axis.field = 'phewas:beta';
        plot.layout.panels[0].axes.y1['label'] = 'Normalized Effect Size (NES)';
        plot.layout.panels[0].data_layers[1].offset = 0;
        plot.layout.panels[0].data_layers[1].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
        scatter_config.y_axis.lower_buffer = 0.15;

        table.setSort('phewas:beta', 'desc');
    }
    plot.applyState();
}

// Changes the number of top variants which are labeled on the plot
// eslint-disable-next-line no-unused-vars
function labelTopVariants(plot, topVariantsToShow) {
    plot.layout.panels[0].data_layers[0].label.filters[1].value = topVariantsToShow;
    plot.applyState();
}
