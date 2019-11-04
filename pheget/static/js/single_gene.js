
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
    const start = +pos - 10000;
    const end = +pos + 10000;
    dataSources
        .add(`assoc_${tissue}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${tissue}` }]);
    initialState = { chr: chrom, start: start, end: end};
    // initialState.genome_build = 'GRCh37';
    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { 
                unnamespaced: true,
                id: `assoc_${tissue}`,
                title: {text: `${tissue}`,x: 400, y: 30},
                data_layers:[
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true });
                        base.fields = [
                            `assoc_${tissue}:altAllele`, `assoc_${tissue}:beta`,
                            `assoc_${tissue}:build`, `assoc_${tissue}:chromosome`,
                            `assoc_${tissue}:gene_id`, `assoc_${tissue}:id`,
                            `assoc_${tissue}:log_pvalue`, `assoc_${tissue}:ma_count`,
                            `assoc_${tissue}:ma_samples`, `assoc_${tissue}:maf`,
                            `assoc_${tissue}:position`, `assoc_${tissue}:refAllele`,
                            `assoc_${tissue}:samples`, `assoc_${tissue}:stderr_beta`,
                            `assoc_${tissue}:symbol`, `assoc_${tissue}:system`,
                            `assoc_${tissue}:tissue`, `assoc_${tissue}:tss_distance`
                        ];
                        base.x_axis.field = `assoc_${tissue}:position`;
                        base.y_axis.field = `assoc_${tissue}:log_pvalue`;
                        base.id_field = `assoc_${tissue}:id`;
                        base.tooltip.html = `
                        <strong>Reference Allele</strong>: {{assoc_${tissue}:refAllele|htmlescape}} <strong> Alternate Allele</strong>: {{assoc_${tissue}:altAllele|htmlescape}}<br>
                        <strong>-Log10(P-value):</strong> {{assoc_${tissue}:log_pvalue|htmlescape}}<br>
                        <strong>Beta (SE):</strong> {{assoc_${tissue}:beta|htmlescape}} ({{assoc_${tissue}:stderr_beta|htmlescape}})<br>
                        `;
                        return base;
                    }(),
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true })
                ] 
            })
        ]
    });
    // generate global variables including plot object, data source object and other metadata
    window.singlegeneplot = LocusZoom.populate(selector, dataSources, layout);
    window.globalvars = {chrom: chrom, start:start, end:end, gene_id: gene_id, tissues:[tissue]};
    window.datasources = dataSources;
}

// add new tissues
function addtissue(newtissue){
    let chrom = globalvars['chrom'];
    let start = globalvars['start'];
    let end = globalvars['end'];
    let gene_id = globalvars['gene_id'];
    globalvars["tissues"].push(newtissue);
    datasources
        .add(`assoc_${newtissue}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${newtissue}` }]);
    newpanel = LocusZoom.Layouts.get('panel','association', { 
                    unnamespaced: true,
                    id: `assoc_${newtissue}`,
                    title: {text: `${newtissue}`,x: 400,y: 30},
                    data_layers:[
                        function(){
                            const base = LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true });
                            base.fields = [
                                `assoc_${newtissue}:altAllele`, `assoc_${newtissue}:beta`,
                                `assoc_${newtissue}:build`, `assoc_${newtissue}:chromosome`,
                                `assoc_${newtissue}:gene_id`, `assoc_${newtissue}:id`,
                                `assoc_${newtissue}:log_pvalue`, `assoc_${newtissue}:ma_count`,
                                `assoc_${newtissue}:ma_samples`, `assoc_${newtissue}:maf`,
                                `assoc_${newtissue}:position`, `assoc_${newtissue}:refAllele`,
                                `assoc_${newtissue}:samples`, `assoc_${newtissue}:stderr_beta`,
                                `assoc_${newtissue}:symbol`, `assoc_${newtissue}:system`,
                                `assoc_${newtissue}:tissue`, `assoc_${newtissue}:tss_distance`
                            ];
                            base.x_axis.field = `assoc_${newtissue}:position`;
                            base.y_axis.field = `assoc_${newtissue}:log_pvalue`;
                            base.id_field = `assoc_${newtissue}:id`;
                            base.tooltip.html = `
                            <strong>Reference Allele</strong>: {{assoc_${newtissue}:refAllele|htmlescape}} <strong> Alternate Allele</strong>: {{assoc_${newtissue}:altAllele|htmlescape}}<br>
                            <strong>-Log10(P-value):</strong> {{assoc_${newtissue}:log_pvalue|htmlescape}}<br>
                            <strong>Beta (SE):</strong> {{assoc_${newtissue}:beta|htmlescape}} ({{assoc_${newtissue}:stderr_beta|htmlescape}})<br>
                            `;
                            return base;
                        }(),
                        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true })
                    ] 
                });
    singlegeneplot.addPanel(newpanel);
    let newbutton = document.createElement("li");
    newbutton.setAttribute('id',`${newtissue}`);
    newbutton.innerHTML = `<button onClick="deletepanel(this.parentNode.id)">Delete</button>`;
    document.getElementById('buttonlist').appendChild(newbutton);
}


// remove tissues
function deletepanel(targetid){
    let panelid = "assoc_" + targetid;
    singlegeneplot.removePanel(panelid);
    document.getElementById(targetid).remove();
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
