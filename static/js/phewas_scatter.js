// This section will define the code required for the plot

LocusZoom.Data.PheGET = LocusZoom.KnownDataSources.extend('PheWASLZ', 'PheGET', {
    getURL(state, chain, fields) {
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});


function makePhewasPlot(chrom, pos, selector) {
    var dataSources= new LocusZoom.DataSources();
    const apiBase = "https://portaldev.sph.umich.edu/api/v1/";
    dataSources
    .add("phewas", ['PheGET', {  // TODO: Override URL generation
        url: `/api/variant/${chrom}_${pos}/`,
    }]);

    // Define the layout
    var layout = LocusZoom.Layouts.get("plot", "standard_phewas", {
        responsive_resize: 'width_only',
        panels: [
            LocusZoom.Layouts.get('panel', 'phewas', {
                unnamespaced: true,
                proportional_height: 1.0,
                data_layers: [
                    // The data layer config is pretty sensitive to field names, so a bunch of stuff needs to be
                    //  customized.
                    // This kind of deep customization isn't well supported by LZ, to be honest, so we're just
                    //  overriding individual keys, one. at. a. time. glamorous.
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
                        base.fields = [
                            '{{namespace[phewas]}}id', '{{namespace[phewas]}}pvalue',
                            '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                            '{{namespace[phewas]}}system',
                        ];
                        base.x_axis.category_field = '{{namespace[phewas]}}system';
                        base.y_axis.field = '{{namespace[phewas]}}pvalue|neglog10';
                        base.color.field =  '{{namespace[phewas]}}system';
                        base.tooltip.html = `
<strong>Gene:</strong> {{{{namespace[phewas]}}gene_id|htmlescape}}<br>
<strong>Tissue:</strong> {{{{namespace[phewas]}}tissue|htmlescape}}<br>
<strong>P-value:</strong> {{{{namespace[phewas]}}pvalue|neglog10|htmlescape}}<br>
<strong>System:</strong> {{{{namespace[phewas]}}system}}<br>`;
                        base.label.text = '{{{{namespace[phewas]}}gene_id}}';
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
    var plot = LocusZoom.populate("#plot", dataSources, layout);
    return [plot, dataSources];
}

// Older single-use functions - obsoleted by groupByThing
/*
function groupByGene(plot) {
    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = 'phewas:gene_id';
    scatter_config.color.field =  'phewas:gene_id';
    scatter_config.label.text = 'phewas:tissue';
    
    plot.applyState();
    }

function groupByTissue(plot) {
    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = 'phewas:tissue';
    scatter_config.color.field =  'phewas:tissue';
    scatter_config.label.text = 'phewas:gene_id';
    
    plot.applyState();
    }

function groupBySystem(plot) {
    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = 'phewas:system';
    scatter_config.color.field =  'phewas:system';
    scatter_config.label.text = 'phewas:gene_id';
    
    plot.applyState();
    }
*/

// Test function for recoloring by group -- thanks Andy!
/*
function groupByThing(plot, tissue_or_gene_id) {
    tissue_or_gene_id = tissue_or_gene_id || 'tissue';
    const gene_or_tissue = tissue_or_gene_id === 'tissue' ? 'gene_id' : 'tissue';

    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = `phewas:${tissue_or_gene_id}`;
    scatter_config.color.field =  `phewas:${tissue_or_gene_id}`;
    scatter_config.label.text = `phewas:${gene_or_tissue}`;

    //plot.clearPanelData(null, 'reset'); // Get rid of tooltips that no longer apply
    plot.applyState();
}
*/

// Changes the variable used to generate groups for coloring purposes; also changes the labeling field
function groupByThing(plot, thing) {
    var group_field, label_field;
    if (thing === 'tissue') {
     group_field = 'tissue';
     label_field = 'gene_id';
     } else {
         if (thing === 'gene_id') {
             group_field = 'gene_id';
             label_field = 'tissue';
         } else {
             group_field = 'system';
             label_field = 'gene_id';
         }
     }

    const scatter_config = plot.layout.panels[0].data_layers[0];

    scatter_config.x_axis.category_field = `phewas:${group_field}`;
    scatter_config.color.field =  `phewas:${group_field}`;
    scatter_config.label.text = `phewas:${label_field}`;

    plot.applyState();
}
