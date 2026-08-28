import { estimate2026 } from '@/data/reglament/estimate-2026';
import {
  ESTIMATE_DETAIL_SOURCE_PDFS,
  type EstimateDetailControlTotal,
  type EstimateDetailControlTotalInput,
  type EstimateDetailCostBucket,
  type EstimateDetailMoneyValue,
  type EstimateDetailQuantityValue,
  type EstimateDetailResource,
  type EstimateDetailSourcePdf,
  type EstimateDetailSourcePdfInfo,
  type EstimateDetailSourceQuoteItem,
  type EstimateDetailSourceRef,
  type EstimateDetailStatus,
  type EstimateDetailStatusInfo,
  type EstimateDetailWorkItem,
} from '@/lib/reglament/detail-schema';
import type {
  EstimateRow,
  NonEmptyReadonlyArray,
} from '@/lib/reglament/schema';

type DetailSourceOptions = Pick<
  EstimateDetailSourceRef,
  'quote' | 'quote_items' | 'note'
>;
type DetailMoneyOptions = Pick<EstimateDetailMoneyValue, 'note'>;
type DetailQuantityOptions = Pick<EstimateDetailQuantityValue, 'note'>;

const detailSourcePdfTitles = {
  final: 'Итоговая смета',
  cleaning: 'Детализация уборки',
  landscaping: 'Детализация озеленения',
  improvement: 'Детализация благоустройства',
  lighting: 'Детализация освещения',
  security: 'Детализация охраны',
  waste: 'Детализация вывоза мусора',
} as const satisfies Record<EstimateDetailSourcePdf, string>;

const detailStatusLabels = {
  verified: 'проверено',
  derived: 'рассчитано',
  needs_check: 'требует проверки',
} as const satisfies Record<EstimateDetailStatus, string>;

const detailSourcePdfPagesTotal: Partial<
  Record<EstimateDetailSourcePdf, number>
> = {
  final: 2,
  cleaning: 27,
  landscaping: 22,
  improvement: 18,
  lighting: 14,
  security: 13,
  waste: 13,
};

const assertFiniteOrNull = (value: number | null, field: string): void => {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${field}: ожидается конечное число или null`);
  }
};

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const flattenRows = (rows: readonly EstimateRow[]): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children ?? [])]);

const estimateRowsById = new Map(
  flattenRows(estimate2026.sections.flatMap((section) => section.rows)).map(
    (row) => [row.id, row],
  ),
);

const estimateSectionsById = new Map(
  estimate2026.sections.map((section) => [section.id, section]),
);

const aggregateTotalFor = (
  estimateRowId: string,
  costBucket: EstimateDetailCostBucket,
): number => {
  if (costBucket === 'other_cost') {
    throw new Error(
      `aggregate total is unavailable for other_cost control ${estimateRowId}`,
    );
  }

  const row = estimateRowsById.get(estimateRowId);

  if (row) return row.baseline.breakdown[costBucket];

  const section = estimateSectionsById.get(estimateRowId);

  if (!section) {
    throw new Error(`estimate row is missing for control ${estimateRowId}`);
  }

  return round2(
    sum(
      section.rows.map(
        (sectionRow) => sectionRow.baseline.breakdown[costBucket],
      ),
    ),
  );
};

const statusForControlTotal = (
  input: EstimateDetailControlTotalInput,
  detailTotal: number,
  aggregateTotal?: number,
): EstimateDetailStatusInfo => {
  const sourceTotal = input.source_total_rub.value;
  const curatedStatus: EstimateDetailStatusInfo =
    input.status === 'needs_check'
      ? {
          status: input.status,
          status_label_ru: input.status_label_ru,
          needs_check: input.needs_check,
        }
      : {
          status: input.status,
          status_label_ru: input.status_label_ru,
        };

  if (sourceTotal === null) {
    return input.status === 'needs_check'
      ? curatedStatus
      : detailNeedsCheckStatus(
          'В источнике контроля нет суммы для сверки.',
          input.source_refs,
        );
  }

  const deltas: readonly (readonly [string, number])[] = [
    ['детализация и источник', round2(detailTotal - sourceTotal)],
    ...(aggregateTotal === undefined
      ? []
      : [
          [
            'агрегированная смета и источник',
            round2(aggregateTotal - sourceTotal),
          ] as const,
          [
            'детализация и агрегированная смета',
            round2(detailTotal - aggregateTotal),
          ] as const,
        ]),
  ] as const;
  const mismatches = deltas.filter(
    ([, delta]) => Math.abs(delta) > input.tolerance_rub,
  );

  if (mismatches.length === 0 || input.status === 'needs_check') {
    return curatedStatus;
  }

  const reason = mismatches
    .map(
      ([label, delta]) =>
        `${label} расходятся на ${delta > 0 ? '+' : ''}${delta} ₽`,
    )
    .join('; ');

  return detailNeedsCheckStatus(
    `Контроль не сходится при допуске ${input.tolerance_rub} ₽: ${reason}.`,
    input.source_refs,
  );
};

export const estimateDetailSourcePdfs = ESTIMATE_DETAIL_SOURCE_PDFS.map(
  (pdf): EstimateDetailSourcePdfInfo => {
    const pagesTotal = detailSourcePdfPagesTotal[pdf];

    return {
      pdf,
      title: detailSourcePdfTitles[pdf],
      ...(pagesTotal ? { pages_total: pagesTotal } : {}),
    };
  },
);

export const detailSource = (
  pdf: EstimateDetailSourcePdf,
  page: number,
  fragment: string,
  options: DetailSourceOptions = {},
): EstimateDetailSourceRef => {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(
      'страница источника детализации должна быть положительным целым числом',
    );
  }
  if (!fragment.trim()) {
    throw new Error('фрагмент источника детализации не должен быть пустым');
  }
  if (options.quote_items?.length === 0) {
    throw new Error(
      'позиции цитаты источника детализации не должны быть пустыми',
    );
  }

  return { pdf, page, fragment, ...options };
};

export const detailSourceQuoteItem = (
  input: EstimateDetailSourceQuoteItem,
): EstimateDetailSourceQuoteItem => {
  if (!input.label.trim()) {
    throw new Error(
      'название позиции цитаты источника детализации не должно быть пустым',
    );
  }
  if (input.resource_ids?.some((resourceId) => !resourceId.trim())) {
    throw new Error(
      'ID ресурсов позиции цитаты источника детализации не должны быть пустыми',
    );
  }

  return input;
};

export const detailSourceQuoteItems = (
  first: EstimateDetailSourceQuoteItem,
  ...rest: readonly EstimateDetailSourceQuoteItem[]
): NonEmptyReadonlyArray<EstimateDetailSourceQuoteItem> => [first, ...rest];

export const detailSourceRefs = (
  first: EstimateDetailSourceRef,
  ...rest: readonly EstimateDetailSourceRef[]
): NonEmptyReadonlyArray<EstimateDetailSourceRef> => [first, ...rest];

export const detailMoney = (
  value: number | null,
  options: DetailMoneyOptions = {},
): EstimateDetailMoneyValue => {
  assertFiniteOrNull(value, 'денежное значение детализации');

  return { value, ...options };
};

export const detailQuantity = (
  value: number | null,
  unit: string | null,
  options: DetailQuantityOptions = {},
): EstimateDetailQuantityValue => {
  assertFiniteOrNull(value, 'количество детализации');

  if (value !== null && unit === null) {
    throw new Error(
      'единица измерения детализации обязательна, если значение известно',
    );
  }

  return { value, unit, ...options };
};

export const detailStatus = (
  status: Exclude<EstimateDetailStatus, 'needs_check'>,
): EstimateDetailStatusInfo => ({
  status,
  status_label_ru: detailStatusLabels[status],
});

export const detailNeedsCheckStatus = (
  reason: string,
  source_refs?: readonly EstimateDetailSourceRef[],
): EstimateDetailStatusInfo => ({
  status: 'needs_check',
  status_label_ru: detailStatusLabels.needs_check,
  needs_check: {
    reason,
    ...(source_refs ? { source_refs } : {}),
  },
});

export const detailWorkItem = (
  input: EstimateDetailWorkItem,
): EstimateDetailWorkItem => input;

export const detailResource = (
  input: EstimateDetailResource,
): EstimateDetailResource => input;

export const detailControlTotal = (
  input: EstimateDetailControlTotalInput,
): EstimateDetailControlTotalInput => ({
  ...input,
  control_source: input.control_source ?? 'section_pdf',
});

export const resolveSectionControlTotals = (
  inputs: readonly EstimateDetailControlTotalInput[],
  resources: readonly EstimateDetailResource[],
): readonly EstimateDetailControlTotal[] => {
  const resourcesById = new Map(
    resources.map((resource) => [resource.id, resource]),
  );

  return inputs.map((input) => {
    const detailTotal = round2(
      sum(
        input.resource_ids.map((resourceId) => {
          const resource = resourcesById.get(resourceId);

          if (!resource) {
            throw new Error(
              `resource ${resourceId} is missing for control ${input.id}`,
            );
          }

          const total = resource.total_rub.value;

          if (total === null) {
            throw new Error(
              `resource ${resource.id} has no total for control ${input.id}`,
            );
          }

          return total;
        }),
      ),
    );
    const aggregateMoney =
      input.aggregate_total_unknown ??
      detailMoney(aggregateTotalFor(input.estimate_row_id, input.cost_bucket));
    const aggregateTotal = aggregateMoney.value ?? undefined;
    const status = statusForControlTotal(input, detailTotal, aggregateTotal);

    return {
      id: input.id,
      estimate_row_id: input.estimate_row_id,
      control_source: input.control_source ?? 'section_pdf',
      cost_bucket: input.cost_bucket,
      source_total_rub: input.source_total_rub,
      detail_total_rub: detailMoney(detailTotal, {
        note: input.detail_total_note,
      }),
      aggregate_total_rub: aggregateMoney,
      delta_rub:
        aggregateTotal === undefined
          ? undefined
          : round2(detailTotal - aggregateTotal),
      tolerance_rub: input.tolerance_rub,
      resource_ids: input.resource_ids,
      source_refs: input.source_refs,
      note: input.note,
      ...status,
    };
  });
};
