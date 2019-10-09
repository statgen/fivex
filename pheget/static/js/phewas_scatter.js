// This section will define the code required for the plot
/* global LocusZoom */

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL(state, chain, fields) {
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});

/*
Data sources are specific javascript objects that are in charge of retrieving data from certain apis and 
process them. Sometimes we want to customize some fields of the available objects to achieve our goal.
*/ 


function makePhewasPlot(chrom, pos, selector) {// add a parameter geneid
    var dataSources= new LocusZoom.DataSources();
    const apiBase = "https://portaldev.sph.umich.edu/api/v1/";
    var pos_lower = Number(pos) - 100000;
    var pos_higher = Number(pos) + 100000;
    dataSources
    .add("phewas", ['PheGET', {  // TODO: Override URL generation
    url: `/api/variant/${chrom}_${pos}/`,
    }])
    .add("gene", ["GeneLZ", { url: apiBase + "annotation/genes/", params: { build: 'GRCh37' } }])
    .add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }]);
    // add function declare a namespace name, the type of datasource the namespace is and parameters that overwrites original data source category

    // Define the layout
    /*
    There are a lot of predefined layouts for plots, panels and data layers.
    get function includes different level of group names
    */
    var layout = LocusZoom.Layouts.get("plot", "standard_phewas", {
        responsive_resize: 'width_only',
        state: {
            variant: `${chrom}:${pos}`,
            start: pos_lower,
            end: pos_higher,
            chr: chrom
        },
        panels: [
            LocusZoom.Layouts.get('panel', 'phewas', {
                unnamespaced: true,// what does this mean?
                proportional_height: 1.0,
                data_layers: [
                    // The data layer config is pretty sensitive to field names, so a bunch of stuff needs to be
                    //  customized.
                    // This kind of deep customization isn't well supported by LZ, to be honest, so we're just
                    //  overriding individual keys, one. at. a. time. glamorous.
                    function () {
                        const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
                        base.fields = [
                            '{{namespace[phewas]}}id', '{{namespace[phewas]}}pvalue',
                            '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                            '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                        ];// this looks like a jinja template but the key value is outside the curly bracket?
                        base.x_axis.category_field = '{{namespace[phewas]}}system';
                        base.y_axis.field = '{{namespace[phewas]}}pvalue|neglog10';// what does middle slash do
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
                                scale_function: "categorical_bin",
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
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>`;// how can I find functions triggered by tooltip
                        base.match = { send: '{{namespace[phewas]}}gene_id', receive: '{{namespace[phewas]}}gene_id' };
                        // base.match.send='{{namespace[phewas]}}gene_id';
                        // base.match.receive='{{namespace[phewas]}}gene_id';
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
                proportional_width: 100,
                data_layers: [
                    function(){
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
                        base.match = { send: '{{namespace[genes]}}gene_id', receive: '{{namespace[genes]}}gene_id' };
                        return base;
                    }()
                ] 
            })
        ]
    });

    // Generate the plot
    var plot = LocusZoom.populate(selector, dataSources, layout);
    // plot.on("element_clicked", function(){
    //     console.log("data requested for LocusZoom plot" + this.panels["phewas"].data_layers["phewaspvalues"].data[0]["phewas:gene_id"]);
    //   });
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
    scatter_config.label.text = `phewas:${label_field}`;

    plot.applyState();
}

$(document).ready(function(){
    // const [plot, datasources] = makePhewasPlot($('#chrom').text(), $('#pos').text(), '#plot');
    $('#tissue').click(function(event){
        event.preventDefault();
        groupByThing(plot,'tissue');
    });
    $('#system').click(function(event){
        event.preventDefault();
        groupByThing(plot,'system');
    });
    $('#symbol').click(function(event){
        event.preventDefault();
        groupByThing(plot,'symbol');
    });
    // $('#debug').click(function(event){
    //     event.preventDefault();
    //     for(p in plot) {
    //         console.log (p, plot[p]);
    //     }
    // });
    // $('#search').click(function(event){
    //     event.preventDefault();
    //     const [plot, datasources] = makePhewasPlot($('#chrom').text(), $('#pos').text(), '#plot', $('#gene').text());
    // });
    // $('#reset').click(function(event){
    //     event.preventDefault();
    //     const [plot, datasources] = makePhewasPlot($('#chrom').text(), $('#pos').text(), '#plot');
    // });

    window.plot=plot;
});
