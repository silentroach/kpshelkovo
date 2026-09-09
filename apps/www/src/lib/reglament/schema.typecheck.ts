import type { EstimateRow } from './schema';

export const validEstimateRow = {
  id: 'cleaning-sample',
  title: 'Sample row',
  kind: 'work',
  coefficient_policy: 'fot',
  baseline: {
    is_enabled: true,
    annual_gross: 120,
    tariff_per_sotka_month: 10,
    breakdown: {
      primary_salary: 10,
      machinist_salary: 0,
      fot: 10,
      machines: 20,
      materials: 30,
      contractors: 0,
      insurance: 3.02,
      overhead: 7,
      profit: 4,
      usn: 0.6,
      income: 74.62,
      vat: 3.731,
      gross: 78.351
    }
  },
  source_refs: [{ pdf: 'final', page: 1 }],
  editable_fields: []
} satisfies EstimateRow;

export const estimateRowWithoutId = {
  title: 'Missing id',
  kind: 'work',
  coefficient_policy: 'fot',
  baseline: validEstimateRow.baseline,
  source_refs: validEstimateRow.source_refs,
  editable_fields: []
  // @ts-expect-error id is required for stable row-level edits and deltas.
} satisfies EstimateRow;

export const estimateRowWithoutTitle = {
  id: 'without-title',
  kind: 'work',
  coefficient_policy: 'fot',
  baseline: validEstimateRow.baseline,
  source_refs: validEstimateRow.source_refs,
  editable_fields: []
  // @ts-expect-error title is required for human-readable UI and data payloads.
} satisfies EstimateRow;

export const estimateRowWithoutSourceRefs = {
  id: 'without-source-refs',
  title: 'Missing source refs',
  kind: 'work',
  coefficient_policy: 'fot',
  baseline: validEstimateRow.baseline,
  editable_fields: []
  // @ts-expect-error source_refs are required for PDF traceability.
} satisfies EstimateRow;

export const estimateRowWithEmptySourceRefs = {
  id: 'empty-source-refs',
  title: 'Empty source refs',
  kind: 'work',
  coefficient_policy: 'fot',
  baseline: validEstimateRow.baseline,
  // @ts-expect-error source_refs must include at least one PDF reference.
  source_refs: [],
  editable_fields: []
} satisfies EstimateRow;

export const estimateRowWithoutBaseline = {
  id: 'without-baseline',
  title: 'Missing baseline',
  kind: 'work',
  coefficient_policy: 'fot',
  source_refs: validEstimateRow.source_refs,
  editable_fields: []
  // @ts-expect-error baseline is required for official comparisons.
} satisfies EstimateRow;
