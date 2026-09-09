import { describe, expect, it } from 'vitest';

import { fullReglamentDataset2026 } from '@/data/reglament/full-2026';

const sourceRefs = (value: unknown): readonly unknown[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const refs = (value as { readonly source_refs?: readonly unknown[] }).source_refs;

  return Array.isArray(refs) ? refs : [];
};

describe('full reglament 2026 dataset', () => {
  it('keeps control totals and collection sizes from the curated artifacts', () => {
    expect(fullReglamentDataset2026).toMatchObject({
      schema_version: '1',
      dataset_id: 'full-reglament-2026',
      tariff_summary: {
        tariff_area_sotka: 20_440.54,
        total_annual_cost_rub: 221_264_198,
        tariff_rub_per_sotka_month: 902.07
      }
    });
    expect(fullReglamentDataset2026.villages).toHaveLength(4);
    expect(fullReglamentDataset2026.common_assets).toHaveLength(33);
    expect(fullReglamentDataset2026.services).toHaveLength(24);
    expect(fullReglamentDataset2026.service_to_estimate_map).toHaveLength(24);
    expect(fullReglamentDataset2026.audit_notes.length).toBeGreaterThanOrEqual(9);
  });

  it('keeps empty common-asset cells as null instead of zero', () => {
    const asset = fullReglamentDataset2026.common_assets.find(
      (item) => item.id === 'roads-parking-sites'
    );

    expect(asset?.values_by_village['shelkovo-park']).toEqual({
      raw: '-',
      value: null,
      status: 'empty_cell'
    });
    expect(asset?.total_mode).toBe('sum_explicit_values');
  });

  it('normalizes service mapping statuses for machine readers', () => {
    const statuses = fullReglamentDataset2026.service_to_estimate_map.reduce(
      (count, item) => ({ ...count, [item.status]: count[item.status] + 1 }),
      { explicit_found: 0, partial: 0, not_found: 0, needs_check: 0 }
    );

    expect(statuses).toEqual({
      explicit_found: 6,
      partial: 13,
      not_found: 4,
      needs_check: 1
    });
  });

  it('keeps PDF source refs on every fact without repo paths', () => {
    const facts = [
      fullReglamentDataset2026.tariff_summary,
      ...fullReglamentDataset2026.villages,
      ...fullReglamentDataset2026.common_assets,
      ...fullReglamentDataset2026.services,
      ...fullReglamentDataset2026.service_to_estimate_map,
      ...fullReglamentDataset2026.calculation_assumptions,
      ...fullReglamentDataset2026.audit_notes
    ];
    const refs = facts.flatMap(sourceRefs) as readonly {
      readonly pdf?: string;
      readonly page?: number;
      readonly fragment?: string;
      readonly pdf_path?: string;
    }[];

    expect(refs.length).toBeGreaterThan(facts.length);
    expect(
      refs.every(
        (ref) =>
          ref.pdf === 'full' &&
          typeof ref.page === 'number' &&
          ref.page > 0 &&
          typeof ref.fragment === 'string' &&
          !('pdf_path' in ref)
      )
    ).toBe(true);
  });
});
