// This section will define the code required for the plot
/* global LocusZoom */

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});


// eslint-disable-next-line no-unused-vars
function makePhewasPlot(chrom, pos, selector) {  // add a parameter geneid
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    pos = +pos;
    var pos_lower = pos - 1000000;
    var pos_higher = pos + 1000000;
    dataSources
        .add('phewas', ['PheGET', {
            url: `/api/variant/${chrom}_${pos}/`,
        }])
        .add('gene', ['GeneLZ', { url: apiBase + 'annotation/genes/', params: { build: 'GRCh37' } }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);

    var layout = LocusZoom.Layouts.get('plot', 'standard_phewas', {
        responsive_resize: 'width_only',
        state: {
            variant: `${chrom}:${pos}`,
            start: pos_lower,
            end: pos_higher,
            chr: chrom
        },
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
<strong>Symbol:</strong> {{{{namespace[phewas]}}symbol|htmlescape}}<br>
<strong>Tissue:</strong> {{{{namespace[phewas]}}tissue|htmlescape}}<br>
<strong>P-value:</strong> {{{{namespace[phewas]}}pvalue|neglog10|htmlescape}}<br>
<strong>Effect size:</strong> {{{{namespace[phewas]}}slope|htmlescape}}<br>
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>`;
                        base.match = { send: '{{namespace[phewas]}}symbol', receive: '{{namespace[phewas]}}symbol' };
                        base.label.text = '{{{{namespace[phewas]}}gene_id}}';
                        base.label.filters[0].field = '{{namespace[phewas]}}pvalue|neglog10';
                        return base;
                    }(),
                    // TODO: Must decide on an appropriate significance threshold for this use case
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                ],
            }),
            LocusZoom.Layouts.get('panel', 'genes',{
                unnamespaced: true,
                margin: { bottom: 40 },
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
                        const base = LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true });
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
        plot.layout.panels[0].data_layers[1].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
    }
    else if (yfield === 'slope') {
        scatter_config.y_axis.field = 'phewas:slope';
        scatter_config.y_axis.floor = undefined;
        plot.layout.panels[0].axes.y1['label'] = 'Effect size';
        plot.layout.panels[0].data_layers[1].offset = 0;
        plot.layout.panels[0].data_layers[1].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
    }
    plot.applyState();
}
