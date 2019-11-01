
LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    }
});


function makeSinglePlot(chrom, pos, gene_id, tissue, selector){
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const start = pos - 10000;
    const end = pos + 10000;
    dataSources
        .add(`assoc`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${tissue}` }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);
    initialState = { chr: chrom, start: pos-10000, end: pos+10000};
    // initialState.genome_build = 'GRCh37';
    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { 
                unnamespaced: true,
                data_layers:[
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true });
                        base.fields = [
                            `{{namespace[assoc]}}alt`, `{{namespace[assoc]}}beta`,
                            `{{namespace[assoc]}}build`, `{{namespace[assoc]}}chrom`,
                            `{{namespace[assoc]}}gene_id`, `{{namespace[assoc]}}id`,
                            `{{namespace[assoc]}}log_pvalue`, `{{namespace[assoc]}}ma_count`,
                            `{{namespace[assoc]}}ma_samples`, `{{namespace[assoc]}}maf`,
                            `{{namespace[assoc]}}pos`, `{{namespace[assoc]}}ref`,
                            `{{namespace[assoc]}}sample_size`, `{{namespace[assoc]}}stderr_beta`,
                            `{{namespace[assoc]}}symbol`, `{{namespace[assoc]}}system`,
                            `{{namespace[assoc]}}tissue`, `{{namespace[assoc]}}tss_distance`
                        ];
                        base.x_axis.field = `{{namespace[assoc]}}pos`;
                        base.y_axis.field = `{{namespace[assoc]}}log_pvalue`;
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
