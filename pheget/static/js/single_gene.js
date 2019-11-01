
LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});

LocusZoom.ScaleFunctions.add('effect_direction', function(parameters, input) {
    if (typeof input !== 'undefined') {
        var slope = input['phewas:slope'];
        var slope_se = input['phewas:slope_se'];
        if (!isNaN(slope) && !isNaN(slope_se)) {
            if (slope - 1.96 * slope_se > 0) { return parameters['+'] || null; } // 1.96*se to find 95% confidence interval
            if (slope + 1.96 * slope_se < 0) { return parameters['-'] || null; }
        }
    }
    return null;
});



function makeSinglePlot(chrom, pos, gene_id, tissue, selector){
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const start = pos - 1000000;
    const end = pos + 1000000;
    dataSources
        .add(`assoc_${tissue}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${tissue}` }])
        .add("ld", ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/", params: { source: '1000G', population: 'ALL' } }])
        .add("catalog", ["GwasCatalogLZ", { url: apiBase + 'annotation/gwascatalog/results/' }])
        .add("constraint", ["GeneConstraintLZ", { url: "//exac.broadinstitute.org/api/constraint" }]);
    initialState = { chr: chrom, start: pos-1000000, end: pos+1000000};
    initialState.genome_build = 'GRCh37';
    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { 
                unnamespaced: true,
                id: `panel_${tissue}`,
                data_layers:[
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'associationpvaluescatalog', { unnamespaced: true });
                        base.fields = [
                            `{{namespace[assoc_${tissue}]}}alt`, `{{namespace[assoc_${tissue}]}}build`,
                            `{{namespace[assoc_${tissue}]}}chrom`, `{{namespace[assoc_${tissue}]}}gene_id`,
                            `{{namespace[assoc_${tissue}]}}id`, `{{namespace[assoc_${tissue}]}}ma_count`,
                            `{{namespace[assoc_${tissue}]}}ma_samples`, `{{namespace[assoc_${tissue}]}}maf`,
                            `{{namespace[assoc_${tissue}]}}pos`, `{{namespace[assoc_${tissue}]}}pvalue`,
                            `{{namespace[assoc_${tissue}]}}ref`, `{{namespace[assoc_${tissue}]}}sample_size`,
                            `{{namespace[assoc_${tissue}]}}slope`, `{{namespace[assoc_${tissue}]}}slope_se`,
                            `{{namespace[assoc_${tissue}]}}symbol`, `{{namespace[assoc_${tissue}]}}system`,
                            `{{namespace[assoc_${tissue}]}}tissue`, `{{namespace[assoc_${tissue}]}}tss_distance`
                        ];
                        base.x_axis.field = `{{namespace[assoc_${tissue}]}}pos`;
                        base.y_axis.field = `{{namespace[assoc_${tissue}]}}pvalue|neglog10`;
                        return base;
                    }(),
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true })
                ] 
            })
        ]
    });
    var plot = LocusZoom.populate(selector, dataSources, layout);
    return [plot, dataSources];
}



// Switches the displayed y-axis value between p-values and slopes (betas)
// eslint-disable-next-line no-unused-vars
// function switchY(plot, yfield) {
//     const scatter_config = plot.layout.panels[0].data_layers[0];
//     if (yfield === 'pvalue') {
//         scatter_config.y_axis.field = 'phewas:pvalue|neglog10';
//         scatter_config.y_axis.floor = 0;
//         plot.layout.panels[0].data_layers[1].offset = 7.301;
//         plot.layout.panels[0].data_layers[1].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
//     }
//     else if (yfield === 'slope') {
//         scatter_config.y_axis.field = 'phewas:slope';
//         scatter_config.y_axis.floor = undefined;
//         plot.layout.panels[0].axes.y1['label'] = 'Effect size';
//         plot.layout.panels[0].data_layers[1].offset = 0;
//         plot.layout.panels[0].data_layers[1].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
//     }
//     plot.applyState();
// }
