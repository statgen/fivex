
LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    },
    annotateData(data) {
        data.forEach(item => {
            item.variant = `${item.chromosome}:${item.position}_${item.refAllele}/${item.altAllele}`;
        });
        return data;
    }
});


function makeSinglePlot(chrom, pos, gene_id, tissue, selector){
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const start = +pos - 20000;
    const end = +pos + 20000;
    dataSources
        .add(`assoc_${tissue}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${tissue}` }])
        .add(`ld`, ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/", params: { source: '1000G', population: 'ALL', build:"GRCh38" } }])
        .add(`recomb`, ["RecombLZ", { url: apiBase + "annotation/recomb/results/", params: {build: "GRCh38"} }]);
    initialState = { chr: chrom, start: start, end: end, lz_match_value: 78573551};
    initialState.genome_build = 'GRCh38';
    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { 
                unnamespaced: true,
                id: `assoc_${tissue}`,
                title: {text: `${tissue}`,x: 250, y: 30},
                data_layers:[
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true });
                        base.fields = [
                            `assoc_${tissue}:altAllele`, `assoc_${tissue}:beta`,
                            `assoc_${tissue}:variant`,
                            `assoc_${tissue}:build`, `assoc_${tissue}:chromosome`,
                            `assoc_${tissue}:gene_id`, `assoc_${tissue}:id`,
                            `assoc_${tissue}:log_pvalue`, `assoc_${tissue}:ma_count`,
                            `assoc_${tissue}:ma_samples`, `assoc_${tissue}:maf`,
                            `assoc_${tissue}:position`, `assoc_${tissue}:refAllele`,
                            `assoc_${tissue}:samples`, `assoc_${tissue}:stderr_beta`,
                            `assoc_${tissue}:symbol`, `assoc_${tissue}:system`,
                            `assoc_${tissue}:tissue`, `assoc_${tissue}:tss_distance`,
                            `ld:isrefvar`, `ld:state`
                        ];
                        base.x_axis.field = `assoc_${tissue}:position`;
                        base.y_axis.field = `assoc_${tissue}:log_pvalue`;
                        base.id_field = `assoc_${tissue}:id`;
                        base.tooltip.html = `
                        <strong>Reference Allele</strong>: {{assoc_${tissue}:refAllele|htmlescape}} <strong> Alternate Allele</strong>: {{assoc_${tissue}:altAllele|htmlescape}}<br>
                        <strong>-Log10(P-value):</strong> {{assoc_${tissue}:log_pvalue|htmlescape}}<br>
                        <strong>Beta (SE):</strong> {{assoc_${tissue}:beta|htmlescape}} ({{assoc_${tissue}:stderr_beta|htmlescape}})<br>
                        <strong>Position :</strong> {{assoc_${tissue}:position|htmlescape}}<br>
                        `;
                        base.match = {send: `assoc_${tissue}:position`, receive: `assoc_${tissue}:position`};
                        // base.color = [
                        //     {
                        //         field: 'lz_highlight_match',  // Special field name whose presence triggers custom rendering
                        //         scale_function: 'if',
                        //         parameters: {
                        //             field_value: true,
                        //             then: '#FFF000'
                        //         }
                        //     },
                        //     {
                        //         field: `ld:isrefvar`,
                        //         scale_function: 'if',
                        //         parameters: {
                        //             field_value: 1,
                        //             then: "#9632b8"
                        //         }
                        //     },
                        //     {
                        //         field: `ld:state`,
                        //         scale_function: 'numerical_bin',
                        //         parameters: {
                        //             breaks: [0, 0.2, 0.4, 0.6, 0.8],
                        //             values: ["#357ebd", "#46b8da", "#5cb85c", "#eea236", "#d43f3a"]
                        //         }
                        //     },
                        //     "#B8B8B8"
                        // ];
                        return base;
                    }(),
                    function(){
                        const base = LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true });
                        // base.fields = [
                        //     `recomb:position`, `recomb:recomb_rate`
                        // ];
                        // base.x_axis.field = `recomb:position`;
                        // base.y_axis.field = `recomb:recomb_rate`;
                        // base.y_axis.ceiling = 10;
                        // base.y_axis.floor = 0;
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
    window.yaxis = "logp";
}

// add new tissues
function addtissue(newtissue){
    let chrom = globalvars['chrom'];
    let start = globalvars['start'];
    let end = globalvars['end'];
    let gene_id = globalvars['gene_id'];
    globalvars["tissues"].push(newtissue);
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    datasources
        .add(`assoc_${newtissue}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&gene_id=${gene_id}&tissue=${newtissue}` }])
        //.add(`ld_${newtissue}`, ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/", params: { source: '1000G', population: 'ALL' } }])
        //.add(`recomb_${newtissue}`, ["RecombLZ", { url: apiBase + "annotation/recomb/results/" }]);
    newpanel = LocusZoom.Layouts.get('panel','association', { 
                    unnamespaced: true,
                    id: `assoc_${newtissue}`,
                    title: {text: `${newtissue}`,x: 250,y: 30},
                    data_layers:[
                        function(){
                            const base = LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true });
                            base.fields = [
                                `assoc_${newtissue}:altAllele`, `assoc_${newtissue}:beta`,
                                `assoc_${newtissue}:variant`,
                                `assoc_${newtissue}:build`, `assoc_${newtissue}:chromosome`,
                                `assoc_${newtissue}:gene_id`, `assoc_${newtissue}:id`,
                                `assoc_${newtissue}:log_pvalue`, `assoc_${newtissue}:ma_count`,
                                `assoc_${newtissue}:ma_samples`, `assoc_${newtissue}:maf`,
                                `assoc_${newtissue}:position`, `assoc_${newtissue}:refAllele`,
                                `assoc_${newtissue}:samples`, `assoc_${newtissue}:stderr_beta`,
                                `assoc_${newtissue}:symbol`, `assoc_${newtissue}:system`,
                                `assoc_${newtissue}:tissue`, `assoc_${newtissue}:tss_distance`,
                                `ld:isrefvar`, `ld:state`
                            ];
                            base.x_axis.field = `assoc_${newtissue}:position`;
                            base.y_axis.field = `assoc_${newtissue}:log_pvalue`;
                            base.y_axis.floor = 0;
                            base.y_axis.lower_buffer = 0;
                            base.y_axis.min_extent = [0,10];
                            base.id_field = `assoc_${newtissue}:id`;
                            base.tooltip.html = `
                            <strong>Reference Allele</strong>: {{assoc_${newtissue}:refAllele|htmlescape}} <strong> Alternate Allele</strong>: {{assoc_${newtissue}:altAllele|htmlescape}}<br>
                            <strong>-Log10(P-value):</strong> {{assoc_${newtissue}:log_pvalue|htmlescape}}<br>
                            <strong>Beta (SE):</strong> {{assoc_${newtissue}:beta|htmlescape}} ({{assoc_${newtissue}:stderr_beta|htmlescape}})<br>
                            `;
                            return base;
                        }(),
                        function(){
                            const base = LocusZoom.Layouts.get('data_layer', 'recomb_rate');
                            // base.fields = [
                            //     `recomb_${newtissue}:position`, `recomb_${newtissue}:recomb_rate`
                            // ];
                            // base.x_axis.field = `recomb_${newtissue}:position`;
                            // base.y_axis.field = `recomb_${newtissue}:recomb_rate`;
                            // base.y_axis.ceiling = 10;
                            // base.y_axis.floor = 0;
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
    datasources.remove("assoc_" + targetid);
    //datasources.remove("ld_" + targetid);
    //datasources.remove("recomb_" + targetid);
    let index = globalvars["tissues"].indexOf(targetid);
    globalvars["tissues"].splice(index, 1);
    document.getElementById(targetid).remove();
}


// switch Y axis 
function switchY(){
    if(yaxis==="logp"){
        // switch to beta
        singlegeneplot.layout.panels.forEach(function(indvpanel){
            // I name the panel id to be the same as datasource namespace
            indvpanel.data_layers[0].y_axis.field = indvpanel.id + ":beta";
            indvpanel.axes.y1['label'] = 'Effect size';
            indvpanel.data_layers[0].y_axis.floor = -2;
            indvpanel.data_layers[0].y_axis.ceiling = 2;
            indvpanel.data_layers[0].y_axis.lower_buffer = 0.25;
            indvpanel.data_layers[0].y_axis.upper_buffer = 0.25;
            indvpanel.data_layers[0].y_axis.min_extent = [-2, 2];
            indvpanel.data_layers[2].offset = 0; 
            indvpanel.data_layers[2].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
            indvpanel.data_layers[0].y_axis.lower_buffer = 0.15;
        });
        yaxis = "beta";
    } else{
        // switch to logp
        singlegeneplot.layout.panels.forEach(function(indvpanel){
            indvpanel.axes.y1['label'] = '- Log 10 P Value';
            indvpanel.data_layers[0].y_axis.field = indvpanel.id + ":log_pvalue";
            indvpanel.data_layers[0].y_axis.floor = 0;
            delete indvpanel.data_layers[0].y_axis.ceiling;
            indvpanel.data_layers[0].y_axis.lower_buffer = 0;
            indvpanel.data_layers[0].y_axis.upper_buffer = 0;
            indvpanel.data_layers[0].y_axis.min_extent = [0, 10];
            indvpanel.data_layers[2].offset = 7.301;
            indvpanel.data_layers[2].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
        });
        yaxis = "logp";
    }
    singlegeneplot.applyState();
}
