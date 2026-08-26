import type {
  EstimateCalculationDisplayValue,
  EstimateCalculationInput,
  EstimateCalculationRow,
} from './calculate.types';
import type {
  CostBreakdown,
  Estimate,
  EstimateCoefficients,
  EstimateDisplayValue,
  EstimateRow,
} from './schema';

const projectDisplayValue = (
  displayValue?: EstimateDisplayValue,
): EstimateCalculationDisplayValue | undefined =>
  displayValue ? { value: displayValue.value } : undefined;

const projectBreakdown = (breakdown: CostBreakdown): CostBreakdown => ({
  primary_salary: breakdown.primary_salary,
  machinist_salary: breakdown.machinist_salary,
  fot: breakdown.fot,
  machines: breakdown.machines,
  materials: breakdown.materials,
  contractors: breakdown.contractors,
  insurance: breakdown.insurance,
  overhead: breakdown.overhead,
  profit: breakdown.profit,
  usn: breakdown.usn,
  income: breakdown.income,
  vat: breakdown.vat,
  gross: breakdown.gross,
});

const projectCoefficients = (
  coefficients: EstimateCoefficients,
): EstimateCoefficients => ({
  insurance_rate: coefficients.insurance_rate,
  overhead_rate: coefficients.overhead_rate,
  profit_rate: coefficients.profit_rate,
  usn_rate: coefficients.usn_rate,
  vat_rate: coefficients.vat_rate,
});

const projectRow = (row: EstimateRow): EstimateCalculationRow => ({
  id: row.id,
  coefficient_policy: row.coefficient_policy,
  baseline: {
    is_enabled: row.baseline.is_enabled,
    base: projectDisplayValue(row.baseline.base),
    frequency: projectDisplayValue(row.baseline.frequency),
    price: projectDisplayValue(row.baseline.price),
    annual_gross: row.baseline.annual_gross,
    tariff_per_sotka_month: row.baseline.tariff_per_sotka_month,
    breakdown: projectBreakdown(row.baseline.breakdown),
  },
  children: row.children?.map(projectRow),
});

export const projectEstimateCalculationInput = (
  estimate: Estimate,
): EstimateCalculationInput => ({
  tariff_area_sotki: estimate.tariff_area_sotki,
  coefficients: projectCoefficients(estimate.coefficients),
  baseline: {
    annual_gross: estimate.baseline.annual_gross,
    tariff_per_sotka_month: estimate.baseline.tariff_per_sotka_month,
  },
  sections: estimate.sections.map((section) => ({
    id: section.id,
    baseline: {
      annual_gross: section.baseline.annual_gross,
      tariff_per_sotka_month: section.baseline.tariff_per_sotka_month,
    },
    rows: section.rows.map(projectRow),
  })),
});
