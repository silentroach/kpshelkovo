import type {
  EstimateDetailControlTotal,
  EstimateDetailDataset,
  EstimateDetailResource,
  EstimateDetailResourceKind
} from './detail-schema';

export const allDetailResourceKinds = [
  'labor',
  'machinist_labor',
  'machine',
  'material',
  'contractor',
  'other_cost'
] as const satisfies readonly EstimateDetailResourceKind[];

export const validEstimateDetailDataset = {
  schema_version: '1.0.0',
  dataset_id: 'estimate-details-2026',
  title: 'Детальная смета 2026',
  year: 2026,
  source_pdfs: [
    {
      pdf: 'cleaning',
      title: 'Детальная смета: уборка',
      pages_total: 12
    }
  ],
  curation_notes: ['Проверочный dataset для typecheck контракта.'],
  work_items: [
    {
      id: 'cleaning-winter-mechanized-snow-removal',
      title: 'Механизированная уборка снега',
      estimate_row_id: 'cleaning-winter-mechanized',
      service_ids: ['winter-period-roads-snow-removal'],
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 2,
          fragment: 'Раздел 1 / строка 1',
          quote: 'Механизированная уборка снега'
        }
      ]
    }
  ],
  resources: [
    {
      id: 'cleaning-winter-mechanized-machine-loader',
      work_item_id: 'cleaning-winter-mechanized-snow-removal',
      estimate_row_id: 'cleaning-winter-mechanized',
      kind: 'machine',
      title: 'Погрузчик',
      cost_bucket: 'machines',
      quantity: {
        value: 10,
        unit: 'маш.-ч'
      },
      unit_price_rub: {
        value: 1_000
      },
      total_rub: {
        value: 10_000
      },
      status: 'verified',
      status_label_ru: 'проверено',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 3,
          fragment: 'Ведомость ресурсов / машины / строка 2'
        }
      ]
    }
  ],
  control_totals: [
    {
      id: 'cleaning-winter-mechanized-machines-total',
      estimate_row_id: 'cleaning-winter-mechanized',
      control_source: 'section_pdf',
      cost_bucket: 'machines',
      source_total_rub: {
        value: 10_000
      },
      detail_total_rub: {
        value: 10_000
      },
      aggregate_total_rub: {
        value: 10_000
      },
      delta_rub: 0,
      tolerance_rub: 0.01,
      status: 'verified',
      status_label_ru: 'сходится',
      source_refs: [
        {
          pdf: 'cleaning',
          page: 4,
          fragment: 'Итого по строке / машины'
        }
      ]
    }
  ]
} satisfies EstimateDetailDataset;

export const detailResourceWithoutId = {
  work_item_id: 'cleaning-winter-mechanized-snow-removal',
  estimate_row_id: 'cleaning-winter-mechanized',
  kind: 'machine',
  title: 'Missing stable id',
  cost_bucket: 'machines',
  total_rub: {
    value: 10_000
  },
  status: 'verified',
  status_label_ru: 'проверено',
  source_refs: validEstimateDetailDataset.resources[0].source_refs
  // @ts-expect-error id is required for stable resource references.
} satisfies EstimateDetailResource;

export const detailControlWithoutEstimateRow = {
  id: 'without-estimate-row',
  cost_bucket: 'machines',
  source_total_rub: {
    value: 10_000
  },
  detail_total_rub: {
    value: 10_000
  },
  status: 'verified',
  status_label_ru: 'сходится',
  source_refs: validEstimateDetailDataset.control_totals[0].source_refs
  // @ts-expect-error estimate_row_id is required for row-level controls.
} satisfies EstimateDetailControlTotal;

export const detailResourceWithFullPdfSource = {
  ...validEstimateDetailDataset.resources[0],
  source_refs: [
    {
      // @ts-expect-error detail sources must reference small estimate PDFs, not full.pdf.
      pdf: 'full',
      page: 127,
      fragment: 'Приложение №2'
    }
  ]
} satisfies EstimateDetailResource;

export const detailResourceWithEmptySourceRefs = {
  ...validEstimateDetailDataset.resources[0],
  // @ts-expect-error source_refs must include at least one PDF reference.
  source_refs: []
} satisfies EstimateDetailResource;
