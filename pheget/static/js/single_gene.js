

function makeSinglePlot(chrom, pos, gene_id, tissue, selector){
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    dataSources
        .add("assoc", ["AssociationLZ", { url: apiBase + "statistic/single/", params: { source: 45, id_field: "variant" } }])
        .add("ld", ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/", params: { source: '1000G', population: 'ALL' } }])
        .add("catalog", ["GwasCatalogLZ", { url: apiBase + 'annotation/gwascatalog/results/' }])
        .add("recomb", ["RecombLZ", { url: apiBase + "annotation/recomb/results/" }])
        .add("constraint", ["GeneConstraintLZ", { url: "//exac.broadinstitute.org/api/constraint" }]);
    initialState = { chr: chrom, start: pos-1000000, end: pos+1000000 };
    initialState.genome_build = 'GRCh37';
    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { unnamespaced: true })
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
