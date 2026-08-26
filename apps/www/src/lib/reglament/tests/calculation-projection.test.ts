import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { calculateEstimate } from '@/lib/reglament/calculate';
import type { EstimateCalculationChanges } from '@/lib/reglament/calculate.types';
import { projectEstimateCalculationInput } from '@/lib/reglament/calculation-projection';

const scenarios = [
  { name: 'official baseline', changes: {} },
  {
    name: 'basic enabled field',
    changes: {
      rows: { 'lighting-electricity': { enabled: false } },
    },
  },
  {
    name: 'quantity fields',
    changes: {
      rows: {
        'lighting-electricity': {
          volume: 200_000,
          frequency: 10,
          rate: 7.1,
        },
      },
    },
  },
  {
    name: 'fixed annual price',
    changes: {
      rows: { 'security-access-control': { fixed_price: 9_000_000 } },
    },
  },
  {
    name: 'expert cost and coefficient fields',
    changes: {
      rows: {
        'waste-transfer-from-homes': {
          primary_salary: 3_000_000,
          machinist_salary: 1_200_000,
          machines: 500_000,
          materials: 50_000,
          contractors: 100_000,
          insurance_rate: 0.31,
          overhead_rate: 0.65,
          profit_rate: 0.35,
          usn_rate: 0.1,
          vat_rate: 0.07,
        },
      },
    },
  },
] as const satisfies readonly {
  readonly name: string;
  readonly changes: EstimateCalculationChanges;
}[];

describe('projectEstimateCalculationInput', () => {
  it('keeps only fields used by the calculation', () => {
    expect(
      JSON.stringify(projectEstimateCalculationInput(estimate2026)),
    ).not.toMatch(
      /"(?:source_refs|editable_fields|description|tags|title|kind|unit|label)"/,
    );
  });

  it.each(scenarios)(
    'matches the canonical estimate for $name',
    ({ changes }) => {
      const projection = projectEstimateCalculationInput(estimate2026);

      expect(calculateEstimate(projection, changes)).toEqual(
        calculateEstimate(estimate2026, changes),
      );
    },
  );
});
