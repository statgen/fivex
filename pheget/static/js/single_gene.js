
LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL() {  // Removed state, chain, fields for now since we are not currently using them
        // FIXME: Instead of hardcoding a single variant as URL, make this part dynamic (build URL from state.chr,
        //      state.start, etc)
        return this.url;
    },
    annotateData(data) {
        data.forEach(item => {
            item.variant = `${item.chromosome}:${item.position}_${item.ref_allele}/${item.alt_allele}`;
            item.beta = item.beta;
        });
        return data;
    }
});


var newscattertooltip = LocusZoom.Layouts.get("data_layer", "association_pvalues", {unnamespaced:true}).tooltip;
newscattertooltip.html = newscattertooltip.html + 
                `<a href='/variant/{{{{namespace[assoc]}}chromosome}}_{{{{namespace[assoc]}}position}}/'>Search this variant</a>`;



var newgenestooltip = LocusZoom.Layouts.get("data_layer", "genes", {unnamespaced:true}).tooltip;
newgenestooltip.html = newgenestooltip.html + `<br> <a onclick="addassoc('{{gene_name}}', false)" href="javascript:void(0);">Add this gene</a>`;

const gene_track = LocusZoom.Layouts.get("data_layer", "genes",{
    unnamespaced:true,
    tooltip: newgenestooltip
});

function makeSinglePlot(chrom, pos, symbol, tissue, selector){
    var dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const start = +pos - 50000;
    const end = +pos + 50000;

    // get rid of the decimal points for the sake of naming
    const symbol_short = symbol.split('.').join("");

    dataSources
        .add(`assoc_${tissue}_${symbol_short}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&symbol=${symbol}&tissue=${tissue}` }])
        .add(`ld`, ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/", params: { source: '1000G', population: 'ALL', build:"GRCh38" } }])
        .add(`recomb`, ["RecombLZ", { url: apiBase + "annotation/recomb/results/", params: {build: "GRCh38"} }])
        .add('gene', ['GeneLZ', { url: apiBase + 'annotation/genes/', params: { build: 'GRCh38' } }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);
    initialState = { chr: chrom, start: start, end: end};
    initialState.genome_build = 'GRCh38';
   
    const namespace = {
        assoc: `assoc_${tissue}_${symbol_short}`
    };

    const assoc_pval = LocusZoom.Layouts.get("data_layer", "association_pvalues", {
        unnamespaced:true,
        fields: [
            '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}position',
            '{{namespace[assoc]}}ref_allele', '{{namespace[assoc]}}variant',
            '{{namespace[assoc]}}beta', '{{namespace[assoc]}}log_pvalue|logtoscinotation',
            '{{namespace[assoc]}}symbol',
            '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
            '{{namespace[assoc]}}chromosome'
        ],
        tooltip: newscattertooltip
    });

    layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        state: initialState,
        panels:[
            LocusZoom.Layouts.get('panel','association', { 
                id: `assoc_${tissue}_${symbol_short}`,
                title: {text: `Association between ${tissue} and ${symbol}`,x: 100, y: 30},
                namespace,
                data_layers: [
                    LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                    LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                    assoc_pval,
                    {
                        id: 'start',
                        type: 'orthogonal_line',
                        orientation: 'vertical',
                        offset: start,
                        style: {
                            'stroke': '#FF3333',
                            'stroke-width': '2px',
                            'stroke-dasharray': '4px 4px'
                        }
                    },
                    {
                        id: 'end',
                        type: 'orthogonal_line',
                        orientation: 'vertical',
                        offset: end,
                        style: {
                            'stroke': '#FF3333',
                            'stroke-width': '2px',
                            'stroke-dasharray': '4px 4px'
                        }
                    }
                ] 
            }),
            LocusZoom.Layouts.get('panel', 'genes',{
                data_layers:[gene_track]
            })
        ]
    });
    // generate global variables including plot object, data source object and other metadata
    window.singlegeneplot = LocusZoom.populate(selector, dataSources, layout);
    window.globalvars = {chrom: chrom, start:start, end:end, symbol: symbol, tissue: tissue};
    window.datasources = dataSources;
    window.yaxis = "logp";
}

// add new tissues
function addassoc(newinfo, istissue){
    let chrom = globalvars['chrom'];
    let start = globalvars['start'];
    let end = globalvars['end'];
    let symbol = globalvars['symbol']; // anchor gene name
    let tissue = globalvars['tissue']; // anchor tissue

    if (istissue){
        tissue = newinfo;
    } else {
        symbol = newinfo;
    }
    // get rid of the parts beyond decimal point for the sake of naming
    const symbol_short = symbol.split('.').join("");
    const namespace = {
        assoc: `assoc_${tissue}_${symbol_short}`
    };
    datasources
        .add(`assoc_${tissue}_${symbol_short}`, ["assocGET", { url: `/api/range?chrom=${chrom}&start=${start}&end=${end}&symbol=${symbol}&tissue=${tissue}` }]);
    
    
    const assoc_pval = LocusZoom.Layouts.get("data_layer", "association_pvalues", {
        unnamespaced:true,
        fields: [
            '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}position',
            '{{namespace[assoc]}}ref_allele', '{{namespace[assoc]}}variant',
            '{{namespace[assoc]}}beta', '{{namespace[assoc]}}log_pvalue|logtoscinotation',
            '{{namespace[assoc]}}symbol',
            '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar',
            '{{namespace[assoc]}}chromosome'
        ],
        tooltip: newscattertooltip
    });

    newpanel = LocusZoom.Layouts.get('panel','association', {
                    id: `assoc_${tissue}_${symbol_short}`,
                    title: {text: `Association between ${tissue} and ${symbol}`,x: 100,y: 30},
                    namespace,
                    data_layers: [
                        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                        LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                        assoc_pval,
                        {
                            id: 'start',
                            type: 'orthogonal_line',
                            orientation: 'vertical',
                            offset: start,
                            style: {
                                'stroke': '#FF3333',
                                'stroke-width': '2px',
                                'stroke-dasharray': '4px 4px'
                            }
                        },
                        {
                            id: 'end',
                            type: 'orthogonal_line',
                            orientation: 'vertical',
                            offset: end,
                            style: {
                                'stroke': '#FF3333',
                                'stroke-width': '2px',
                                'stroke-dasharray': '4px 4px'
                            }
                        }
                    ]  
                });
    singlegeneplot.removePanel('genes');
    try{
        singlegeneplot.addPanel(newpanel);
    } catch(error){
        alert("The requested plot has already been generated!");
    }
    singlegeneplot.addPanel(LocusZoom.Layouts.get('panel', 'genes', {
        data_layers:[gene_track]
    }));
    // let newbutton = document.createElement("li");
    // newbutton.setAttribute('id',`${newtissue}`);
    // newbutton.innerHTML = `<button onClick="deletepanel(this.parentNode.id)">Delete</button>`;
    // document.getElementById('buttonlist').appendChild(newbutton);
}


// remove tissues
// function deletepanel(targetid){
//     let panelid = "assoc_" + targetid;
//     singlegeneplot.removePanel(panelid);
//     datasources.remove("assoc_" + targetid);
//     //datasources.remove("ld_" + targetid);
//     //datasources.remove("recomb_" + targetid);
//     let index = globalvars["tissues"].indexOf(targetid);
//     globalvars["tissues"].splice(index, 1);
//     document.getElementById(targetid).remove();
// }


// switch Y axis 
function switchY(){
    assco_panels = singlegeneplot.layout.panels.slice(0,-1);
    if(yaxis==="logp"){
        // switch to beta
        assco_panels.forEach(function(indvpanel){
            // I name the panel id to be the same as datasource namespace
            indvpanel.data_layers[2].y_axis.field = indvpanel.id + ":beta";
            indvpanel.axes.y1['label'] = 'Effect size';
            indvpanel.data_layers[2].y_axis.floor = -2;
            indvpanel.data_layers[2].y_axis.ceiling = 2;
            indvpanel.data_layers[2].y_axis.lower_buffer = 0.25;
            indvpanel.data_layers[2].y_axis.upper_buffer = 0.25;
            indvpanel.data_layers[2].y_axis.min_extent = [-2, 2];
            indvpanel.data_layers[0].offset = 0; 
            indvpanel.data_layers[0].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
            indvpanel.data_layers[2].y_axis.lower_buffer = 0.15;
        });
        yaxis = "beta";
    } else{
        // switch to logp
        assco_panels.forEach(function(indvpanel){
            indvpanel.axes.y1['label'] = '- Log 10 P Value';
            indvpanel.data_layers[2].y_axis.field = indvpanel.id + ":log_pvalue";
            indvpanel.data_layers[2].y_axis.floor = 0;
            delete indvpanel.data_layers[2].y_axis.ceiling;
            indvpanel.data_layers[2].y_axis.lower_buffer = 0;
            indvpanel.data_layers[2].y_axis.upper_buffer = 0;
            indvpanel.data_layers[2].y_axis.min_extent = [0, 10];
            indvpanel.data_layers[0].offset = 7.301;
            indvpanel.data_layers[0].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
        });
        yaxis = "logp";
    }
    singlegeneplot.applyState();
}
