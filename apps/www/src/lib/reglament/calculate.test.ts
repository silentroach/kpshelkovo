import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import type { Estimate } from '@/lib/reglament/schema';

import { calculateEstimate } from './calculate';

type CalculatedRow = ReturnType<
  typeof calculateEstimate
>['sections'][number]['rows'][number];

const flattenCalculatedRows = (
  rows: readonly CalculatedRow[],
): readonly CalculatedRow[] =>
  rows.flatMap((row) => [row, ...flattenCalculatedRows(row.children ?? [])]);

const sourceRefs = [
  { pdf: 'final', page: 1, fragment: 'test fixture' },
] as const;

const emptyBreakdown = {
  primary_salary: 0,
  machinist_salary: 0,
  fot: 0,
  machines: 0,
  materials: 0,
  contractors: 0,
  insurance: 0,
  overhead: 0,
  profit: 0,
  usn: 0,
  income: 0,
  vat: 0,
  gross: 0,
} as const;

const quantityFixture = {
  id: 'quantity-fixture',
  year: 2026,
  title: 'Quantity fixture',
  tariff_area_sotki: 100,
  coefficients: {
    insurance_rate: 0.302,
    overhead_rate: 0.7,
    profit_rate: 0.4,
    usn_rate: 0.15,
    vat_rate: 0.05,
  },
  baseline: {
    annual_gross: 1_200,
    tariff_per_sotka_month: 1,
  },
  source_refs: sourceRefs,
  sections: [
    {
      id: 'quantity-section',
      title: 'Quantity section',
      baseline: {
        annual_gross: 1_200,
        tariff_per_sotka_month: 1,
      },
      source_refs: sourceRefs,
      rows: [
        {
          id: 'quantity-row',
          title: 'Quantity row',
          kind: 'work',
          coefficient_policy: 'fot',
          baseline: {
            is_enabled: true,
            base: { value: 10, unit: 'м²' },
            frequency: { value: 2, unit: 'раз/год' },
            price: { value: 5, unit: '₽' },
            annual_gross: 1_200,
            tariff_per_sotka_month: 1,
            breakdown: {
              primary_salary: 100,
              machinist_salary: 50,
              fot: 150,
              machines: 100,
              materials: 50,
              contractors: 0,
              insurance: 45,
              overhead: 105,
              profit: 60,
              usn: 9,
              income: 1_000,
              vat: 200,
              gross: 1_200,
            },
          },
          source_refs: sourceRefs,
          editable_fields: [],
        },
      ],
    },
  ],
} satisfies Estimate;

const formulaFixture = {
  ...quantityFixture,
  id: 'formula-fixture',
  baseline: {
    annual_gross: 0,
    tariff_per_sotka_month: 0,
  },
  sections: [
    {
      id: 'formula-section',
      title: 'Formula section',
      baseline: {
        annual_gross: 0,
        tariff_per_sotka_month: 0,
      },
      source_refs: sourceRefs,
      rows: [
        {
          id: 'formula-row',
          title: 'Formula row',
          kind: 'work',
          coefficient_policy: 'fot',
          baseline: {
            is_enabled: true,
            annual_gross: 0,
            tariff_per_sotka_month: 0,
            breakdown: emptyBreakdown,
          },
          source_refs: sourceRefs,
          editable_fields: [],
        },
      ],
    },
  ],
} satisfies Estimate;

describe('calculateEstimate', () => {
  it('returns the official baseline total and tariff without changes', () => {
    const result = calculateEstimate(estimate2026);

    expect(result.annual_gross).toBe(221_264_198);
    expect(result.tariff_per_sotka_month).toBe(902.07);
    expect(result.delta_annual_gross).toBe(0);
    expect(result.delta_tariff_per_sotka_month).toBe(0);
    expect(
      result.sections.every((section) => section.delta_annual_gross === 0),
    ).toBe(true);
  });

  it('keeps calculated baseline rows identical to the feed baseline', () => {
    const result = calculateEstimate(estimate2026);
    const calculatedRowsById = new Map<string, CalculatedRow>(
      result.sections.flatMap((section) =>
        flattenCalculatedRows(section.rows).map(
          (row) => [row.id, row] as const,
        ),
      ),
    );

    for (const section of estimate2026.sections) {
      for (const row of section.rows) {
        const calculated = calculatedRowsById.get(row.id);

        expect(calculated).toMatchObject({
          annual_gross: row.baseline.annual_gross,
          tariff_per_sotka_month: row.baseline.tariff_per_sotka_month,
          delta_annual_gross: 0,
          delta_tariff_per_sotka_month: 0,
          breakdown: row.baseline.breakdown,
        });
      }
    }
  });

  it('applies a fixed annual price override to the row, section and total', () => {
    const result = calculateEstimate(estimate2026, {
      rows: {
        'lighting-electricity': { fixed_price: 1_573_084 },
      },
    });
    const section = result.sections.find(
      (item) => item.id === 'lighting-power',
    );
    const row = section?.rows.find(
      (item) => item.id === 'lighting-electricity',
    );

    expect(row).toMatchObject({
      annual_gross: 1_573_084,
      tariff_per_sotka_month: 6.42,
      delta_annual_gross: 100_000,
      delta_tariff_per_sotka_month: 0.41,
    });
    expect(section).toMatchObject({
      annual_gross: 11_838_585,
      tariff_per_sotka_month: 48.27,
      delta_annual_gross: 100_000,
      delta_tariff_per_sotka_month: 0.41,
    });
    expect(result).toMatchObject({
      annual_gross: 221_364_198,
      tariff_per_sotka_month: 902.48,
      delta_annual_gross: 100_000,
      delta_tariff_per_sotka_month: 0.41,
    });
  });

  it('can exclude a row from the estimate', () => {
    const result = calculateEstimate(estimate2026, {
      rows: {
        'lighting-electricity': { enabled: false },
      },
    });
    const section = result.sections.find(
      (item) => item.id === 'lighting-power',
    );
    const row = section?.rows.find(
      (item) => item.id === 'lighting-electricity',
    );

    expect(row).toMatchObject({
      is_enabled: false,
      annual_gross: 0,
      tariff_per_sotka_month: 0,
      delta_annual_gross: -1_473_084,
      delta_tariff_per_sotka_month: -6.01,
    });
    expect(section).toMatchObject({
      annual_gross: 10_265_501,
      tariff_per_sotka_month: 41.85,
      delta_annual_gross: -1_473_084,
      delta_tariff_per_sotka_month: -6.01,
    });
  });

  it('scales row costs by volume, frequency and rate changes', () => {
    const result = calculateEstimate(quantityFixture, {
      rows: {
        'quantity-row': { volume: 20, frequency: 3, rate: 10 },
      },
    });
    const row = result.sections[0]?.rows[0];

    expect(row).toMatchObject({
      annual_gross: 7_200,
      tariff_per_sotka_month: 6,
      delta_annual_gross: 6_000,
      delta_tariff_per_sotka_month: 5,
      breakdown: {
        primary_salary: 600,
        machinist_salary: 300,
        fot: 900,
        machines: 600,
        materials: 300,
        insurance: 270,
        overhead: 630,
        profit: 360,
        usn: 54,
        income: 6_000,
        vat: 1_200,
        gross: 7_200,
      },
    });
  });

  it('ignores negative volume, frequency and rate changes', () => {
    const result = calculateEstimate(quantityFixture, {
      rows: {
        'quantity-row': { volume: -20, frequency: -3, rate: -10 },
      },
    });

    expect(result.sections[0]?.rows[0]).toMatchObject({
      annual_gross: 1_200,
      tariff_per_sotka_month: 1,
      delta_annual_gross: 0,
      delta_tariff_per_sotka_month: 0,
      breakdown: quantityFixture.sections[0].rows[0].baseline.breakdown,
    });
  });

  it('recalculates expert cost fields with insurance, overhead, profit, USN and VAT', () => {
    const result = calculateEstimate(formulaFixture, {
      rows: {
        'formula-row': {
          primary_salary: 1_000,
          machinist_salary: 500,
          machines: 200,
          materials: 300,
          contractors: 400,
        },
      },
    });
    const row = result.sections[0]?.rows[0];

    expect(row).toMatchObject({
      annual_gross: 4_822.65,
      tariff_per_sotka_month: 4.02,
      breakdown: {
        primary_salary: 1_000,
        machinist_salary: 500,
        fot: 1_500,
        machines: 200,
        materials: 300,
        contractors: 400,
        insurance: 453,
        overhead: 1_050,
        profit: 600,
        usn: 90,
        income: 4_593,
        vat: 229.65,
        gross: 4_822.65,
      },
    });
  });
});
