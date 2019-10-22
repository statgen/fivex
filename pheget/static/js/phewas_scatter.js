// This section will define the code required for the plot
/* global LocusZoom */

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});

LocusZoom.DataLayers.extend('category_scatter', 'category_scatter', { // a new name would lose css
    _prepareData: function() {
        var xField = this.layout.x_axis.field || 'x';
        // The (namespaced) field from `this.data` that will be used to assign datapoints to a given category & color
        var category_field = this.layout.x_axis.category_field;
        if (!category_field) {
            throw new Error('Layout for ' + this.layout.id + ' must specify category_field');
        }

        // If the layout defines a `category_sorting_field`, then sort the categories according to the negative numeric value of it.
        // If two points have the same value of `category_field`, they MUST have the same value of `category_sorting_field`.
        var sourceData;
        var category_sorting_field = this.layout.x_axis.category_sorting_field;
        if (category_sorting_field !== undefined) {
            var sort_value_for_category = {};
            // Assert that each category has only one value for the `category_sorting_field`
            this.data.forEach(function(d) {
                if (!Object.prototype.hasOwnProperty.call(sort_value_for_category, d[category_field])) {
                    sort_value_for_category[d[category_field]] = d[category_sorting_field];
                } else if (sort_value_for_category[d[category_field]] !== d[category_sorting_field]) {
                    throw new Error('Unable to sort PheWAS plot categories by ' + category_sorting_field + ' because the category ' + d[category_field]
                                    + ' can have either the value "' + sort_value_for_category[d[category_field]] + '" or "' + d[category_sorting_field] + '".');
                }
            });

            // Sort the data so that things in the same category are adjacent
            sourceData = this.data
                .sort(function(a, b) {
                    var av = -sort_value_for_category[a[category_field]]; // sort descending
                    var bv = -sort_value_for_category[b[category_field]];
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


// eslint-disable-next-line no-unused-vars
function makePhewasPlot(chrom, pos, selector) {  // add a parameter geneid
    var dataSources = new LocusZoom.DataSources();
    dataSources
        .add('phewas', ['PheGET', {
            url: `/api/variant/${chrom}_${pos}/`,
        }]);

    var layout = LocusZoom.Layouts.get('plot', 'standard_phewas', {
        responsive_resize: 'width_only',
        panels: [
            LocusZoom.Layouts.get('panel', 'phewas', {
                unnamespaced: true,
                proportional_height: 1.0,
                data_layers: [
                    function () {
                        const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
                        base.fields = [
                            '{{namespace[phewas]}}id', '{{namespace[phewas]}}pvalue',
                            '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                            '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                            '{{namespace[phewas]}}slope', '{{namespace[phewas]}}slope_se',
                            '{{namespace[phewas]}}tss_distance',
                        ];
                        base.x_axis.category_field = '{{namespace[phewas]}}system';
                        base.y_axis.field = '{{namespace[phewas]}}pvalue|neglog10';
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
                                field: '{{namespace[phewas]}}system',
                                scale_function: 'categorical_bin',
                                parameters: {
                                    categories: [],
                                    values: [],
                                    null_value: '#B8B8B8'
                                }
                            }
                        ];
                        base.tooltip.html = `
<strong>Gene:</strong> {{{{namespace[phewas]}}gene_id|htmlescape}}<br>
<strong>TSS distance:</strong> {{{{namespace[phewas]}}tss_distance|htmlescape}}<br>
<strong>Symbol:</strong> {{{{namespace[phewas]}}symbol|htmlescape}}<br>
<strong>Tissue:</strong> {{{{namespace[phewas]}}tissue|htmlescape}}<br>
<strong>P-value:</strong> {{{{namespace[phewas]}}pvalue|neglog10|htmlescape}}<br>
<strong>Effect size:</strong> {{{{namespace[phewas]}}slope|htmlescape}}<br>
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>`;
                        base.match = { send: '{{namespace[phewas]}}gene_id', receive: '{{namespace[phewas]}}gene_id' };
                        base.label.text = '{{{{namespace[phewas]}}symbol}}';
                        base.label.filters[0].field = '{{namespace[phewas]}}pvalue|neglog10';
                        return base;
                    }(),
                    // TODO: Must decide on an appropriate significance threshold for this use case
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                ],
            }),

        ]
    });

    // Generate the plot
    var plot = LocusZoom.populate(selector, dataSources, layout);
    return [plot, dataSources];
}

// Changes the variable used to generate groups for coloring purposes; also changes the labeling field
// eslint-disable-next-line no-unused-vars
function groupByThing(plot, thing) {
    var group_field, label_field;
    if (thing === 'tissue') {
        group_field = 'tissue';
        label_field = 'symbol';
    } else {
        if (thing === 'symbol') {
            group_field = 'symbol';
            label_field = 'tissue';
        } else {
            group_field = 'system';
            label_field = 'symbol';
        }
    }

    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = `phewas:${group_field}`;

    scatter_config.color[2].field = `phewas:${group_field}`;
    scatter_config.label.text = `{{phewas:${label_field}}}`;
    scatter_config.match.send = scatter_config.match.receive = `phewas:${label_field}`;
    plot.applyState();
}

// Switches the displayed y-axis value between p-values and slopes (betas)
// eslint-disable-next-line no-unused-vars
function switchY(plot, yfield) {
    const scatter_config = plot.layout.panels[0].data_layers[0];
    if (yfield === 'pvalue') {
        scatter_config.y_axis.field = 'phewas:pvalue|neglog10';
        scatter_config.y_axis.floor = 0;
        plot.layout.panels[0].data_layers[1].offset = 7.301;
        plot.layout.panels[0].data_layers[1].style = {"stroke": "#D3D3D3", "stroke-width": "3px", "stroke-dasharray": "10px 10px"};
    }
    else if (yfield === 'slope') {
        scatter_config.y_axis.field = 'phewas:slope';
        scatter_config.y_axis.floor = undefined;
        plot.layout.panels[0].axes.y1['label'] = 'Effect size';
        plot.layout.panels[0].data_layers[1].offset = 0;
        plot.layout.panels[0].data_layers[1].style = {"stroke": "gray", "stroke-width": "1px", "stroke-dasharray": "10px 0px"};
    }
    if (group_field === 'symbol') {
        scatter_config.x_axis.category_sorting_field = 'phewas:tss_distance';
    } else {
        delete scatter_config.x_axis.category_sorting_field;
    }
    plot.applyState();
}
