import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { estimateDetails2026 } from '@/data/reglament/estimate-details-2026';
import { fullReglamentDataset2026 } from '@/data/reglament/full-2026';
import type {
  EstimateDetailControlTotal,
  EstimateDetailResource,
  EstimateDetailSourceRef
} from '@/lib/reglament/detail-schema';
import type { EstimateRow } from '@/lib/reglament/schema';

type DetailFactWithSourceRefs = {
  readonly fact_id: string;
  readonly source_refs: readonly EstimateDetailSourceRef[];
};

type ControlTotalSumMismatch = {
  readonly control_total_id: string;
  readonly issue: string;
  readonly declared_total_rub: number | null;
  readonly resources_without_total?: readonly string[];
  readonly resource_total_rub?: number;
  readonly delta_rub?: number;
  readonly tolerance_rub?: number;
};

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const flattenRows = (rows: readonly EstimateRow[]): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children ?? [])]);

const estimateRows = flattenRows(estimate2026.sections.flatMap((section) => section.rows));

const estimateItemIds = new Set([
  estimate2026.id,
  ...estimate2026.sections.map((section) => section.id),
  ...estimateRows.map((row) => row.id)
]);

const estimateRowsById = new Map(estimateRows.map((row) => [row.id, row]));

const estimateSectionsById = new Map(estimate2026.sections.map((section) => [section.id, section]));

const sourcePdfIds = new Set(estimateDetails2026.source_pdfs.map((sourcePdf) => sourcePdf.pdf));

const serviceIds = new Set(fullReglamentDataset2026.services.map((service) => service.id));

const resourcesById = new Map(
  estimateDetails2026.resources.map((resource) => [resource.id, resource])
);

const obviousMultiPositionQuotePatterns = [
  /Костюм .*; Куртка/,
  /Ледоруб.*; Метла/,
  /Метла .*; Грабли/,
  /Рабочий.*; Машинист/,
  /Трактор .*; ОПМ/,
  /Видеокамера/
] as const;

const hasOwnPropertyDeep = (value: unknown, key: string): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;

  return Object.values(value).some((nestedValue) => hasOwnPropertyDeep(nestedValue, key));
};

const detailFactsWithSourceRefs = (): readonly DetailFactWithSourceRefs[] => [
  ...estimateDetails2026.work_items.map((item) => ({
    fact_id: `work_items:${item.id}`,
    source_refs: item.source_refs
  })),
  ...estimateDetails2026.resources.map((resource) => ({
    fact_id: `resources:${resource.id}`,
    source_refs: resource.source_refs
  })),
  ...estimateDetails2026.control_totals.map((controlTotal) => ({
    fact_id: `control_totals:${controlTotal.id}`,
    source_refs: controlTotal.source_refs
  }))
];

const resourcesForControlTotal = (
  controlTotal: EstimateDetailControlTotal
): readonly EstimateDetailResource[] => {
  if (controlTotal.resource_ids) {
    return controlTotal.resource_ids.flatMap((id) => {
      const resource = resourcesById.get(id);

      return resource ? [resource] : [];
    });
  }

  return estimateDetails2026.resources.filter(
    (resource) =>
      resource.estimate_row_id === controlTotal.estimate_row_id &&
      resource.cost_bucket === controlTotal.cost_bucket
  );
};

const aggregateTotalForControl = (controlTotal: EstimateDetailControlTotal): number | undefined => {
  if (controlTotal.cost_bucket === 'other_cost') return;

  const costBucket = controlTotal.cost_bucket;
  const row = estimateRowsById.get(controlTotal.estimate_row_id);

  if (row) return row.baseline.breakdown[costBucket];

  const section = estimateSectionsById.get(controlTotal.estimate_row_id);

  if (!section) return;

  return round2(sum(section.rows.map((sectionRow) => sectionRow.baseline.breakdown[costBucket])));
};

describe('estimate details 2026 dataset', () => {
  it('keeps fact IDs unique within each collection across sections', () => {
    const ids = detailFactsWithSourceRefs().map((fact) => fact.fact_id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps final.pdf controls traceable to exact source rows', () => {
    const finalControls = estimateDetails2026.control_totals
      .filter((controlTotal) => controlTotal.control_source === 'final_pdf')
      .map((controlTotal) => ({
        id: controlTotal.id,
        estimate_row_id: controlTotal.estimate_row_id,
        source_total_rub: controlTotal.source_total_rub.value,
        detail_total_rub: controlTotal.detail_total_rub?.value ?? null,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        delta_rub: controlTotal.delta_rub ?? null,
        status: controlTotal.status,
        source_ref: controlTotal.source_refs[0]
      }));

    expect(finalControls).toMatchSnapshot();
  });

  it('migrates multi-position quote items in every section detail module', () => {
    const sectionPdfs = [
      'cleaning',
      'improvement',
      'landscaping',
      'lighting',
      'security',
      'waste'
    ] as const;
    const refsWithItems = detailFactsWithSourceRefs()
      .flatMap((fact) => fact.source_refs)
      .filter((ref) => ref.quote_items !== undefined);
    const migratedPdfs = [...new Set(refsWithItems.map((ref) => ref.pdf))].sort();
    const invalidItems = refsWithItems.flatMap((ref) =>
      (ref.quote_items ?? []).flatMap((item, itemIndex) => {
        const errors = [
          item.label.trim() ? null : 'пустое название позиции',
          ref.quote?.trim() ? null : 'нет общей цитаты source_refs[].quote',
          item.resource_ids?.length === 0 ? 'пустой список ID ресурсов' : null
        ].filter((error): error is string => error !== null);

        return errors.length > 0
          ? [
              {
                pdf: ref.pdf,
                page: ref.page,
                fragment: ref.fragment,
                item_index: itemIndex,
                errors
              }
            ]
          : [];
      })
    );

    expect(migratedPdfs).toEqual([...sectionPdfs].sort());
    expect(invalidItems).toEqual([]);
  });

  it('keeps public contract free of curation fragments', () => {
    const quoteItemLeaks = detailFactsWithSourceRefs()
      .flatMap((fact) => fact.source_refs.map((ref) => ({ fact_id: fact.fact_id, ref })))
      .flatMap(({ fact_id, ref }) =>
        (ref.quote_items ?? []).flatMap((item, itemIndex) => {
          const errors = [
            Object.prototype.hasOwnProperty.call(item, 'quote') ? 'лишнее поле quote' : null,
            hasOwnPropertyDeep(item, 'raw') ? 'лишнее поле raw' : null
          ].filter((error): error is string => error !== null);

          return errors.length > 0
            ? [
                {
                  fact_id,
                  pdf: ref.pdf,
                  page: ref.page,
                  fragment: ref.fragment,
                  item_index: itemIndex,
                  errors
                }
              ]
            : [];
        })
      );

    expect(quoteItemLeaks).toEqual([]);
    expect(hasOwnPropertyDeep(estimateDetails2026, 'raw')).toBe(false);
  });

  it('keeps obvious multi-position resource quotes structured', () => {
    const missingStructuredItems = detailFactsWithSourceRefs()
      .flatMap((fact) => fact.source_refs.map((ref) => ({ fact_id: fact.fact_id, ref })))
      .filter(({ ref }) =>
        obviousMultiPositionQuotePatterns.some((pattern) => pattern.test(ref.quote ?? ''))
      )
      .filter(({ ref }) => ref.quote_items === undefined)
      .map(({ fact_id, ref }) => ({
        fact_id,
        pdf: ref.pdf,
        page: ref.page,
        fragment: ref.fragment,
        quote: ref.quote
      }));

    expect(missingStructuredItems).toEqual([]);
  });

  it('keeps quote item resource IDs backed by the complete dataset', () => {
    const missingResources = detailFactsWithSourceRefs().flatMap((fact) =>
      fact.source_refs.flatMap((ref) =>
        (ref.quote_items ?? []).flatMap((item) =>
          (item.resource_ids ?? [])
            .filter((id) => !resourcesById.has(id))
            .map((id) => ({ fact_id: fact.fact_id, resource_id: id }))
        )
      )
    );

    expect(missingResources).toEqual([]);
  });

  it('keeps PDF source refs on every detail fact', () => {
    const facts = detailFactsWithSourceRefs();
    const missingRefs = facts
      .filter((fact) => fact.source_refs.length === 0)
      .map((fact) => fact.fact_id);
    const invalidRefs = facts.flatMap((fact) =>
      fact.source_refs.flatMap((ref, sourceRefIndex) => {
        const errors = [
          sourcePdfIds.has(ref.pdf) ? null : 'unknown pdf',
          Number.isInteger(ref.page) && ref.page > 0 ? null : 'invalid page',
          ref.fragment.trim() ? null : 'empty fragment'
        ].filter((error): error is string => error !== null);

        return errors.length > 0
          ? [
              {
                fact_id: fact.fact_id,
                source_ref_index: sourceRefIndex,
                errors
              }
            ]
          : [];
      })
    );

    expect({ missingRefs, invalidRefs }).toEqual({
      missingRefs: [],
      invalidRefs: []
    });
  });

  it('keeps needs_check reasons and source refs actionable', () => {
    const invalidNeedsCheck = [
      ...estimateDetails2026.work_items.map((item) => ({
        fact_id: `work_items:${item.id}`,
        item
      })),
      ...estimateDetails2026.resources.map((item) => ({
        fact_id: `resources:${item.id}`,
        item
      })),
      ...estimateDetails2026.control_totals.map((item) => ({
        fact_id: `control_totals:${item.id}`,
        item
      }))
    ].flatMap(({ fact_id, item }) => {
      if (item.status !== 'needs_check') return [];

      const checkSourceRefs = item.needs_check.source_refs ?? item.source_refs;
      const errors = [
        item.needs_check.reason.trim() ? null : 'empty reason',
        checkSourceRefs.length > 0 ? null : 'empty check source refs',
        checkSourceRefs.every(
          (ref) =>
            sourcePdfIds.has(ref.pdf) &&
            Number.isInteger(ref.page) &&
            ref.page > 0 &&
            ref.fragment.trim().length > 0
        )
          ? null
          : 'invalid check source ref'
      ].filter((error): error is string => error !== null);

      return errors.length > 0 ? [{ fact_id, errors }] : [];
    });

    expect(invalidNeedsCheck).toEqual([]);
  });

  it('keeps every estimate_row_id backed by estimate-2026 rows or sections', () => {
    const missingRows = [
      ...estimateDetails2026.work_items.map((item) => ({
        fact_id: `work_items:${item.id}`,
        estimate_row_id: item.estimate_row_id
      })),
      ...estimateDetails2026.resources.map((resource) => ({
        fact_id: `resources:${resource.id}`,
        estimate_row_id: resource.estimate_row_id
      })),
      ...estimateDetails2026.control_totals.map((controlTotal) => ({
        fact_id: `control_totals:${controlTotal.id}`,
        estimate_row_id: controlTotal.estimate_row_id
      }))
    ].filter((item) => !estimateItemIds.has(item.estimate_row_id));

    expect(missingRows).toEqual([]);
  });

  it('keeps every service_id backed by full-2026 when present', () => {
    const missingServices = estimateDetails2026.work_items.flatMap((item) =>
      (item.service_ids ?? [])
        .filter((serviceId) => !serviceIds.has(serviceId))
        .map((serviceId) => ({
          work_item_id: item.id,
          service_id: serviceId
        }))
    );

    expect(missingServices).toEqual([]);
  });

  it('keeps resource sums aligned with control totals within explicit tolerance', () => {
    const missingTolerance = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.tolerance_rub === undefined ||
          !Number.isFinite(controlTotal.tolerance_rub) ||
          controlTotal.tolerance_rub < 0
      )
      .map((controlTotal) => controlTotal.id);
    const missingResourceIds = estimateDetails2026.control_totals.flatMap((controlTotal) =>
      (controlTotal.resource_ids ?? [])
        .filter((id) => !resourcesById.has(id))
        .map((resourceId) => ({
          control_total_id: controlTotal.id,
          resource_id: resourceId
        }))
    );
    const sumMismatches: readonly ControlTotalSumMismatch[] =
      estimateDetails2026.control_totals.flatMap(
        (controlTotal): readonly ControlTotalSumMismatch[] => {
          if (controlTotal.control_source === 'final_pdf') {
            return [];
          }

          if (controlTotal.tolerance_rub === undefined) {
            return [];
          }

          const declaredTotal =
            controlTotal.detail_total_rub?.value ?? controlTotal.source_total_rub.value;
          const resources = resourcesForControlTotal(controlTotal);
          const resourcesWithoutTotal = resources
            .filter((resource) => resource.total_rub.value === null)
            .map((resource) => resource.id);

          if (declaredTotal === null || resourcesWithoutTotal.length > 0) {
            return [
              {
                control_total_id: controlTotal.id,
                issue: 'missing comparable totals',
                declared_total_rub: declaredTotal,
                resources_without_total: resourcesWithoutTotal
              }
            ];
          }

          const resourceTotal = round2(
            sum(resources.map((resource) => resource.total_rub.value ?? 0))
          );
          const delta = round2(resourceTotal - declaredTotal);

          return Math.abs(delta) <= controlTotal.tolerance_rub
            ? []
            : [
                {
                  control_total_id: controlTotal.id,
                  issue: 'sum mismatch',
                  declared_total_rub: declaredTotal,
                  resource_total_rub: resourceTotal,
                  delta_rub: delta,
                  tolerance_rub: controlTotal.tolerance_rub
                }
              ];
        }
      );
    const derivedValueMismatches = estimateDetails2026.control_totals.flatMap((controlTotal) => {
      if (controlTotal.control_source === 'final_pdf') return [];

      const detailTotal = controlTotal.detail_total_rub?.value;
      const aggregateTotal = controlTotal.aggregate_total_rub?.value;
      const expectedAggregateTotal = aggregateTotalForControl(controlTotal);

      if (
        detailTotal === null ||
        detailTotal === undefined ||
        aggregateTotal === null ||
        expectedAggregateTotal === undefined
      ) {
        return [];
      }

      const expectedDelta = round2(detailTotal - expectedAggregateTotal);

      return aggregateTotal === expectedAggregateTotal && controlTotal.delta_rub === expectedDelta
        ? []
        : [
            {
              control_total_id: controlTotal.id,
              aggregate_total_rub: aggregateTotal,
              expected_aggregate_total_rub: expectedAggregateTotal,
              delta_rub: controlTotal.delta_rub,
              expected_delta_rub: expectedDelta
            }
          ];
    });
    const uncheckedMismatches = estimateDetails2026.control_totals.flatMap((controlTotal) => {
      const tolerance = controlTotal.tolerance_rub;

      if (
        controlTotal.control_source === 'final_pdf' ||
        controlTotal.status === 'needs_check' ||
        tolerance === undefined
      ) {
        return [];
      }

      const sourceTotal = controlTotal.source_total_rub.value;
      const detailTotal = controlTotal.detail_total_rub?.value;
      const aggregateTotal = controlTotal.aggregate_total_rub?.value;

      if (sourceTotal === null || detailTotal === null || detailTotal === undefined) {
        return [controlTotal.id];
      }

      const deltas = [round2(detailTotal - sourceTotal)];

      if (aggregateTotal !== null && aggregateTotal !== undefined) {
        deltas.push(round2(aggregateTotal - sourceTotal), round2(detailTotal - aggregateTotal));
      }

      return deltas.some((delta) => Math.abs(delta) > tolerance) ? [controlTotal.id] : [];
    });

    expect({
      missingTolerance,
      missingResourceIds,
      sumMismatches,
      derivedValueMismatches,
      uncheckedMismatches
    }).toEqual({
      missingTolerance: [],
      missingResourceIds: [],
      sumMismatches: [],
      derivedValueMismatches: [],
      uncheckedMismatches: []
    });
  });
});
