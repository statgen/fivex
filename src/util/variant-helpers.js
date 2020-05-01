import LocusZoom from 'locuszoom';

import { PORTALDEV_URL } from '@/util/common';

export function getPlotSources(chrom, pos) {
  return [
    ['phewas', ['PheGET', { url: `/api/data/variant/${chrom}_${pos}/` }]],
    ['gene', ['GeneLZ', { url: `${PORTALDEV_URL}annotation/genes/`, params: { build: 'GRCh38' } }]],
    ['constraint', ['GeneConstraintLZ', {
      url: 'https://gnomad.broadinstitute.org/api',
      params: { build: 'GRCh38' },
    }]],
  ];
}

export function getPlotLayout(chrom, pos, initialState = {}) {
  return LocusZoom.Layouts.get('plot', 'standard_phewas', {
    responsive_resize: 'width_only',
    state: initialState,
    dashboard: {
      components: [
        {
          color: 'gray',
          position: 'right',
          type: 'download',
        },

      ],
    },
    panels: [
      ((() => {
        const panel = LocusZoom.Layouts.get('panel', 'phewas', {
          unnamespaced: true,
          min_height: 500,
          dashboard: {
            components: [
              {
                color: 'gray',
                position: 'right',
                type: 'toggle_legend',
              },
            ],
          },
          legend: {
            orientation: 'vertical',
            origin: { x: 55, y: 30 },
            pad_from_right: 50 + 10, // 50 is panel.margin.right
            hidden: true,
          },
          data_layers: [
            ((() => {
              const base = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true });
              base.fields = [
                '{{namespace[phewas]}}id', '{{namespace[phewas]}}log_pvalue',
                '{{namespace[phewas]}}gene_id', '{{namespace[phewas]}}tissue',
                '{{namespace[phewas]}}system', '{{namespace[phewas]}}symbol',
                '{{namespace[phewas]}}beta', '{{namespace[phewas]}}stderr_beta',
                '{{namespace[phewas]}}tss_distance',
                '{{namespace[phewas]}}top_value_rank',
                '{{namespace[phewas]}}chromosome', '{{namespace[phewas]}}position',
                '{{namespace[phewas]}}ref_allele', '{{namespace[phewas]}}alt_allele',
                '{{namespace[phewas]}}ma_samples', '{{namespace[phewas]}}ma_count',
                '{{namespace[phewas]}}maf', '{{namespace[phewas]}}samples',
                '{{namespace[phewas]}}pip_cluster', '{{namespace[phewas]}}spip',
                '{{namespace[phewas]}}pip', '{{namespace[phewas]}}pip|pip_yvalue',
              ];
              base.x_axis.category_field = '{{namespace[phewas]}}symbol';
              base.y_axis.field = '{{namespace[phewas]}}log_pvalue';
              base.x_axis.category_order_field = 'phewas:tss_distance';
              base.y_axis.min_extent = [0, 8];

              base.legend = [
                {
                  shape: 'circle',
                  size: 40,
                  label: 'Non-significant effect',
                  class: 'lz-data_layer-scatter',
                },
                {
                  shape: 'triangle-up',
                  size: 40,
                  label: 'Positive effect',
                  class: 'lz-data_layer-scatter',
                },
                {
                  shape: 'triangle-down',
                  size: 40,
                  label: 'Negative effect',
                  class: 'lz-data_layer-scatter',
                },
              ];

              base.color = [
                {
                  field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
                  scale_function: 'if',
                  parameters: {
                    field_value: true,
                    then: '#ED180A',
                  },
                },
                {
                  field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
                  scale_function: 'if',
                  parameters: {
                    field_value: false,
                    then: '#EAE6E6',
                  },
                },
                {
                  field: '{{namespace[phewas]}}symbol',
                  scale_function: 'categorical_bin',
                  parameters: {
                    categories: [],
                    values: [],
                    null_value: '#B8B8B8',
                  },
                },
              ];
              base.point_shape = [
                {
                  scale_function: 'effect_direction',
                  parameters: {
                    '+': 'triangle-up',
                    '-': 'triangle-down',
                  },
                },
                'circle',
              ];

              base.tooltip.html = `
<strong>Variant:</strong> {{{{namespace[phewas]}}chromosome|htmlescape}}:{{{{namespace[phewas]}}position|htmlescape}} {{{{namespace[phewas]}}ref_allele|htmlescape}}/{{{{namespace[phewas]}}alt_allele|htmlescape}}<br>
<strong>Gene ID:</strong> {{{{namespace[phewas]}}gene_id|htmlescape}}<br>
<strong>Gene name:</strong> <i>{{{{namespace[phewas]}}symbol|htmlescape}}</i><br>
<strong>Tissue (sample size):</strong> {{{{namespace[phewas]}}tissue|htmlescape}} ({{{{namespace[phewas]}}samples|htmlescape}})<br>
<strong>-Log10(P-value):</strong> {{{{namespace[phewas]}}log_pvalue|twosigfigs|htmlescape}}<br>
<strong>NES (SE):</strong> {{{{namespace[phewas]}}beta|twosigfigs|htmlescape}} ({{{{namespace[phewas]}}stderr_beta|twosigfigs|htmlescape}})<br>
<strong>MAF:</strong> {{{{namespace[phewas]}}maf|twosigfigs|htmlescape}}<br>
<strong>TSS distance:</strong> {{{{namespace[phewas]}}tss_distance|htmlescape}}<br>
<strong>System:</strong> {{{{namespace[phewas]}}system|htmlescape}}<br>
<strong>PIP:</strong> {{{{namespace[phewas]}}pip|pip_display}}<br>
<strong>SPIP:</strong> {{{{namespace[phewas]}}spip|pip_display}}<br>
<strong>PIP cluster:</strong> {{{{namespace[phewas]}}pip_cluster|pip_display}}<br>
<a href='/region/?position={{{{namespace[phewas]}}position|urlencode}}&chrom={{{{namespace[phewas]}}chromosome|urlencode}}&gene_id={{{{namespace[phewas]}}gene_id|urlencode}}&tissue={{{{namespace[phewas]}}tissue|urlencode}}'>See region plot for <i>{{{{namespace[phewas]}}symbol}}</i> x {{{{namespace[phewas]}}tissue}}</a>
`;
              base.match = {
                send: '{{namespace[phewas]}}tissue',
                receive: '{{namespace[phewas]}}tissue',
              };
              base.label.text = '{{{{namespace[phewas]}}tissue}}';
              base.label.filters = [
                { field: '{{namespace[phewas]}}log_pvalue', operator: '>=', value: 10 },
                { field: '{{namespace[phewas]}}top_value_rank', operator: '<=', value: 5 },
              ];
              return base;
            })()),
            LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
          ],
        });
        panel.axes.y1.label_offset = 38;
        return panel;
      })()),
      LocusZoom.Layouts.get('panel', 'genes', {
        unnamespaced: true,
        margin: { bottom: 40 },
        min_height: 150,
        axes: {
          x: {
            label: `Chromosome ${chrom} (Mb)`,
            label_offset: 32,
            tick_format: 'region',
            extent: 'state',
          },
        },
        data_layers: [
          ((() => {
            const base = LocusZoom.Layouts.get('data_layer', 'genes', {
              unnamespaced: true,
              exon_height: 8,
              bounding_box_padding: 5,
              track_vertical_spacing: 5,
              exon_label_spacing: 3,
            });
            base.color = [
              {
                field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
                scale_function: 'if',
                parameters: {
                  field_value: true,
                  then: '#ED180A',
                },
              },
            ];
            base.match = {
              send: '{{namespace[genes]}}gene_name',
              receive: '{{namespace[genes]}}gene_name',
            };
            return base;
          })()),
          {
            id: 'variant',
            type: 'orthogonal_line',
            orientation: 'vertical',
            offset: pos,
            style: {
              stroke: '#FF3333',
              'stroke-width': '2px',
              'stroke-dasharray': '4px 4px',
            },
          },
        ],
      }),
    ],
  });
}

/**
 * Layout mutation function: Changes the variable used to generate groups for coloring purposes;
 *  also changes the labeling field. This function modifies the input layout: it has side effects
 * @param layout
 * @param thing
 */
export function groupByThing(layout, thing) {
  let point_label_field;
  const scatter_config = layout.panels[0].data_layers[0];
  delete scatter_config.x_axis.category_order_field;
  if (thing === 'tissue') {
    point_label_field = 'symbol';
  } else if (thing === 'symbol') {
    // label by gene name, but arrange those genes based on position
    point_label_field = 'tissue';
    scatter_config.x_axis.category_order_field = 'phewas:tss_distance';
  } else if (thing === 'system') {
    point_label_field = 'symbol';
  } else {
    throw new Error('Unrecognized grouping field');
  }
  scatter_config.x_axis.category_field = `phewas:${thing}`;
  scatter_config.color[2].field = `phewas:${thing}`;
  scatter_config.label.text = `{{phewas:${point_label_field}}}`;
  // eslint-disable-next-line no-multi-assign
  scatter_config.match.send = scatter_config.match.receive = `phewas:${point_label_field}`;
}

/**
 * Plot + Layout mutation function: changes the field used for the y-axis.
 *
 * In the future parts of this could probably be computed to reduce amt of code
 * @param plot
 * @param yfield
 */
export function switchY(plot, yfield) {
  const scatter_config = plot.layout.panels[0].data_layers[0];
  if (yfield === 'log_pvalue') {
    scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 10 };
    scatter_config.legend = [
      {
        shape: 'circle',
        size: 40,
        label: 'Non-significant effect',
        class: 'lz-data_layer-scatter',
      },
      { shape: 'triangle-up', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
      {
        shape: 'triangle-down',
        size: 40,
        label: 'Negative effect',
        class: 'lz-data_layer-scatter',
      },
    ];
    delete scatter_config.y_axis.ceiling;
    delete plot.layout.panels[0].axes.y1.ticks;
    plot.panels.phewas.legend.hide();
    scatter_config.y_axis.field = 'phewas:log_pvalue';
    scatter_config.y_axis.floor = 0;
    scatter_config.y_axis.lower_buffer = 0;
    scatter_config.y_axis.min_extent = [0, 8];
    scatter_config.point_shape = [
      {
        scale_function: 'effect_direction',
        parameters: {
          '+': 'triangle-up',
          '-': 'triangle-down',
        },
      },
      'circle',
    ];
    plot.layout.panels[0].axes.y1.label = '-log 10 p-value';
    plot.layout.panels[0].data_layers[1].offset = 7.301;
    plot.layout.panels[0].data_layers[1].style = {
      stroke: '#D3D3D3',
      'stroke-width': '3px',
      'stroke-dasharray': '10px 10px',
    };
  } else if (yfield === 'beta') {
    scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 10 };
    scatter_config.legend = [
      {
        shape: 'circle',
        size: 40,
        label: 'Non-significant effect',
        class: 'lz-data_layer-scatter',
      },
      { shape: 'triangle-up', size: 40, label: 'Positive effect', class: 'lz-data_layer-scatter' },
      {
        shape: 'triangle-down',
        size: 40,
        label: 'Negative effect',
        class: 'lz-data_layer-scatter',
      },
    ];
    delete scatter_config.y_axis.floor;
    delete scatter_config.y_axis.min_extent;
    delete scatter_config.y_axis.ceiling;
    delete plot.layout.panels[0].axes.y1.ticks;
    plot.panels.phewas.legend.hide();
    scatter_config.y_axis.field = 'phewas:beta';
    plot.layout.panels[0].axes.y1.label = 'Normalized Effect Size (NES)';
    plot.layout.panels[0].data_layers[1].offset = 0;
    scatter_config.point_shape = [
      {
        scale_function: 'effect_direction',
        parameters: {
          '+': 'triangle-up',
          '-': 'triangle-down',
        },
      },
      'circle',
    ];
    plot.layout.panels[0].data_layers[1].style = {
      stroke: 'gray',
      'stroke-width': '1px',
      'stroke-dasharray': '10px 0px',
    };
    scatter_config.y_axis.lower_buffer = 0.15;
  } else if (yfield === 'pip') {
    scatter_config.label.filters[0] = { field: 'phewas:log_pvalue', operator: '>=', value: 0 };
    scatter_config.legend = [
      { shape: 'cross', size: 40, label: 'Cluster 1', class: 'lz-data_layer-scatter' },
      { shape: 'square', size: 40, label: 'Cluster 2', class: 'lz-data_layer-scatter' },
      { shape: 'triangle-up', size: 40, label: 'Cluster 3', class: 'lz-data_layer-scatter' },
      { shape: 'triangle-down', size: 40, label: 'Cluster 4+', class: 'lz-data_layer-scatter' },
      { shape: 'circle', size: 40, label: 'No cluster', class: 'lz-data_layer-scatter' },
    ];
    plot.panels.phewas.legend.show();
    scatter_config.y_axis.field = 'phewas:pip|pip_yvalue';
    scatter_config.y_axis.floor = -4.1;
    scatter_config.y_axis.ceiling = 0.2;
    scatter_config.y_axis.lower_buffer = 0;
    scatter_config.point_shape = [
      { scale_function: 'pip_cluster' },
      'circle',
    ];
    plot.layout.panels[0].axes.y1.label = 'Posterior Inclusion Probability (PIP)';
    plot.layout.panels[0].axes.y1.ticks = [
      { position: 'left', text: '1', y: 0 },
      { position: 'left', text: '0.1', y: -1 },
      { position: 'left', text: '0.01', y: -2 },
      { position: 'left', text: '1e-3', y: -3 },
      { position: 'left', text: '≤1e-4', y: -4 },
    ];
    plot.layout.panels[0].data_layers[1].offset = -1000;
  }
}

// Tabulator formatting helpers
function two_digit_fmt1(cell) {
  const x = cell.getValue();
  const d = -Math.floor(Math.log10(Math.abs(x)));
  return (d < 6) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
}

function two_digit_fmt2(cell) {
  const x = cell.getValue();
  const d = -Math.floor(Math.log10(Math.abs(x)));
  return (d < 4) ? x.toFixed(Math.max(d + 1, 2)) : x.toExponential(1);
}

function pip_fmt(cell) {
  const x = cell.getValue();
  if (x === 0) {
    return '-';
  }
  return x.toPrecision(2);
}

export function tabulator_tooltip_maker(cell) {
  // Only show tooltips when an ellipsis ('...') is hiding part of the data.
  // When `element.scrollWidth` is bigger than `element.clientWidth`, that means that data is hidden.
  // Unfortunately the ellipsis sometimes activates when it's not needed, hiding data while `clientWidth == scrollWidth`.
  // Fortunately, these tooltips are just a convenience so it's fine if they fail to show.
  const e = cell.getElement();
  if (e.clientWidth >= e.scrollWidth) {
    return false; // all the text is shown, so there is no '...', so tooltip is unneeded
  }
  return e.innerText; // shows what's in the HTML (from `formatter`) instead of just `cell.getValue()`
}

export const TABLE_BASE_COLUMNS = [
  {
    title: 'Gene',
    field: 'phewas:symbol',
    headerFilter: true,
    formatter(cell) {
      return `<i>${cell.getValue()} (${cell.getData()['phewas:gene_id']}</i>)`;
    },
  },
  { title: 'Tissue', field: 'phewas:tissue', headerFilter: true },
  { title: 'System', field: 'phewas:system', headerFilter: true },
  {
    title: '-log<sub>10</sub>(p)',
    field: 'phewas:log_pvalue',
    formatter: two_digit_fmt2,
    sorter: 'number',
  },
  { title: 'Effect Size', field: 'phewas:beta', formatter: two_digit_fmt1, sorter: 'number' },
  { title: 'SE (Effect Size)', field: 'phewas:stderr_beta', formatter: two_digit_fmt1 },
  { title: 'PIP', field: 'phewas:pip', formatter: pip_fmt },
];
