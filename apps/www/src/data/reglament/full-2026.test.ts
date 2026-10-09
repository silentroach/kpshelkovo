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

    expect(statuses).toMatchInlineSnapshot(`
      {
        "explicit_found": 5,
        "needs_check": 1,
        "not_found": 4,
        "partial": 14,
      }
    `);
  });

  it('keeps road-gutter cleaning partial with its evidence and estimate links', () => {
    const mapping = fullReglamentDataset2026.service_to_estimate_map.find(
      (item) => item.service_id === 'summer-road-gutters-cleaning'
    );

    expect(mapping).toMatchInlineSnapshot(`
      {
        "estimate_row_ids": [
          "cleaning-summer-manual",
        ],
        "estimate_section_ids": [
          "cleaning",
        ],
        "estimate_source_refs": [
          {
            "fragment": "Сводная смета / строка 2.4",
            "page": 125,
            "pdf": "full",
          },
        ],
        "explanation": "Летняя ручная уборка использует базу «открытые ливневые траншеи»; это близко к дорожным лоткам, но не совпадает дословно.",
        "service_id": "summer-road-gutters-cleaning",
        "source_refs": [
          {
            "fragment": "Приложение №4 / В летний период / строка 6",
            "page": 135,
            "pdf": "full",
            "quote": "Уборка дорожных лотков от мусора и скошенной травы ручным способом: 15 раз в летний период",
          },
          {
            "fragment": "Сводная смета / строка 2.4",
            "page": 125,
            "pdf": "full",
          },
        ],
        "status": "partial",
        "status_label_ru": "частично",
        "verification_note": "частично сопоставлено",
      }
    `);
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
