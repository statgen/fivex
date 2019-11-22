/* global LocusZoom */

LocusZoom.Data.assocGET = LocusZoom.KnownDataSources.extend('AssociationLZ', 'assocGET', {
    getURL(state) {
        return `${this.url}?chrom=${state.chr}&start=${state.start}&end=${state.end}&gene_id=${this.params.gene_id}&tissue=${this.params.tissue}`;
    },
    annotateData(data) {
        data.forEach(item => {
            item.variant = `${item.chromosome}:${item.position}_${item.ref_allele}/${item.alt_allele}`;
        });
        return data;
    }
});


var newscattertooltip = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {unnamespaced: true }).tooltip;
newscattertooltip.html = newscattertooltip.html +
                `<a href='/variant/{{{{namespace[assoc]}}chromosome}}_{{{{namespace[assoc]}}position}}/'>Search this variant</a>`;



var newgenestooltip = LocusZoom.Layouts.get('data_layer', 'genes', {unnamespaced: true}).tooltip;
newgenestooltip.html = newgenestooltip.html + `<br> <a onclick="addassoc('{{gene_id}}', false)" href="javascript:void(0);">Add this gene</a>`;

const gene_track = LocusZoom.Layouts.get('data_layer', 'genes', {
    unnamespaced: true,
    tooltip: newgenestooltip
});

// eslint-disable-next-line no-unused-vars
function makeSinglePlot(chrom, pos, gene_id, tissue, selector) {
    let dataSources = new LocusZoom.DataSources();
    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const start = +pos - 80000;  // Set to smaller values for testing; go up to 50k or 200k after we make it more efficient
    const end = +pos + 80000;

    // get rid of the decimal points for the sake of naming
    const geneid_short = gene_id.split('.')[0];

    dataSources
        .add(`assoc_${tissue}_${geneid_short}`, ['assocGET', {
            url: '/api/range/',
            params: { gene_id, tissue }
        }])
        .add(`ld`, ['LDLZ2', { url: 'https://portaldev.sph.umich.edu/ld/', params: { source: '1000G', population: 'ALL', build: 'GRCh38' } }])
        .add(`recomb`, ['RecombLZ', { url: apiBase + 'annotation/recomb/results/', params: {build: 'GRCh38'} }])
        .add('gene', ['GeneLZ', { url: apiBase + 'annotation/genes/', params: { build: 'GRCh38' } }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);
    let initialState = { chr: chrom, start: start, end: end};
    initialState.genome_build = 'GRCh38';

    const namespace = {
        assoc: `assoc_${tissue}_${geneid_short}`
    };

    const assoc_pval = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
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

    let layout = LocusZoom.Layouts.get('plot', 'association_catalog', {
        state: initialState,
        panels: [
            LocusZoom.Layouts.get('panel', 'association', {
                id: `assoc_${tissue}_${geneid_short}`,
                title: {text: `Association between ${tissue} and ${geneid_short}`, x: 100, y: 30},
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
            LocusZoom.Layouts.get('panel', 'genes', {
                data_layers: [gene_track]
            })
        ]
    });
    // generate global variables including plot object, data source object and other metadata
    const singlegeneplot = LocusZoom.populate(selector, dataSources, layout);
    window.globalvars = {chrom: chrom, start: start, end: end, anchor_gene_id: gene_id, anchor_tissue: tissue};

    window.yaxis = 'logp';
    return [singlegeneplot, dataSources];
}

// add new tissues
// eslint-disable-next-line no-unused-vars
function addassoc(plot, datasources, newinfo, istissue) {
    let start = plot.state.start;
    let end = plot.state.end;
    let gene_id = globalvars['anchor_gene_id']; // anchor gene name
    let tissue = globalvars['anchor_tissue']; // anchor tissue

    if (istissue) {
        tissue = newinfo;
    } else {
        gene_id = newinfo;
    }
    // get rid of the parts beyond decimal point for the sake of naming
    const geneid_short = gene_id.split('.')[0];
    const namespace = {
        assoc: `assoc_${tissue}_${geneid_short}`
    };
    datasources
        .add(`assoc_${tissue}_${geneid_short}`, ['assocGET', { url: '/api/range/', params: { gene_id, tissue } }]);


    const assoc_pval = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
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

    let newpanel = LocusZoom.Layouts.get('panel', 'association', {
        id: `assoc_${tissue}_${geneid_short}`,
        y_index: -1,
        title: {text: `Association between ${tissue} and ${geneid_short}`, x: 100, y: 30},
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

    try {
        plot.addPanel(newpanel);
    } catch(error) {
        alert('The requested plot has already been generated!');
    }
}

/**
 * switch Y axis
 * yfield = 'log_pvalue' or 'beta', and is the field we want to use as the plotted Y variable
 * @param plot
 * @param yfield
 */
// eslint-disable-next-line no-unused-vars
function switchY_single(plot, yfield) {
    let assoc_panels = plot.layout.panels.slice(0, -1);
    if (yfield === 'beta') {
        // switch to beta
        assoc_panels.forEach(function(indvpanel) {
            // I name the panel id to be the same as datasource namespace
            let panel_base_y = indvpanel.data_layers[2].y_axis;
            indvpanel.axes.y1['label'] = 'Normalized Effect Size (NES)';
            indvpanel.data_layers[0].offset = 0;  // Change dotted horizontal line to y=0
            indvpanel.data_layers[0].style = {'stroke': 'gray', 'stroke-width': '1px', 'stroke-dasharray': '10px 0px'};
            panel_base_y.field = indvpanel.id + ':beta';
            delete panel_base_y.floor;
            delete panel_base_y.ceiling;
            delete panel_base_y.min_extent; // FIXME: Replace these extents with good default values rather than removing this
        });
    } else { // yfield == 'log_pvalue'
        // switch to logp
        assoc_panels.forEach(function(indvpanel) {
            let panel_base_y = indvpanel.data_layers[2].y_axis;
            delete indvpanel.data_layers[2].y_axis.ceiling;
            indvpanel.axes.y1['label'] = '-log 10 p-Value';
            indvpanel.data_layers[0].offset = 7.301;  // change dotted horizontal line to genomewide significant value 5e-8
            indvpanel.data_layers[0].style = {'stroke': '#D3D3D3', 'stroke-width': '3px', 'stroke-dasharray': '10px 10px'};
            panel_base_y.field = indvpanel.id + ':log_pvalue';
            panel_base_y.floor = 0;  // Set minimum y value to zero when looking at -log10 p-values
        });
    }
    singlegeneplot.applyState();
}