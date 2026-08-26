import type {
  CostBreakdown,
  EstimateCoefficientPolicy,
  EstimateCoefficients,
} from './schema';

export interface EstimateRowChange {
  readonly enabled?: boolean;
  readonly volume?: number;
  readonly frequency?: number;
  readonly rate?: number;
  readonly fixed_price?: number;
  readonly primary_salary?: number;
  readonly machinist_salary?: number;
  readonly machines?: number;
  readonly materials?: number;
  readonly contractors?: number;
  readonly insurance_rate?: number;
  readonly overhead_rate?: number;
  readonly profit_rate?: number;
  readonly usn_rate?: number;
  readonly vat_rate?: number;
}

export interface EstimateCalculationChanges {
  readonly rows?: Readonly<Record<string, EstimateRowChange>>;
}

export interface EstimateCalculationDisplayValue {
  readonly value: number;
}

export interface EstimateCalculationRowBaseline {
  readonly is_enabled: boolean;
  readonly base?: EstimateCalculationDisplayValue;
  readonly frequency?: EstimateCalculationDisplayValue;
  readonly price?: EstimateCalculationDisplayValue;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly breakdown: CostBreakdown;
}

export interface EstimateCalculationRow {
  readonly id: string;
  readonly coefficient_policy: EstimateCoefficientPolicy;
  readonly baseline: EstimateCalculationRowBaseline;
  readonly children?: readonly EstimateCalculationRow[];
}

export interface EstimateCalculationSection {
  readonly id: string;
  readonly baseline: {
    readonly annual_gross: number;
    readonly tariff_per_sotka_month: number;
  };
  readonly rows: readonly EstimateCalculationRow[];
}

export interface EstimateCalculationInput {
  readonly tariff_area_sotki: number;
  readonly coefficients: EstimateCoefficients;
  readonly baseline: {
    readonly annual_gross: number;
    readonly tariff_per_sotka_month: number;
  };
  readonly sections: readonly EstimateCalculationSection[];
}

export interface CalculatedEstimateRow {
  readonly id: string;
  readonly is_enabled: boolean;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly breakdown: CostBreakdown;
  readonly children?: readonly CalculatedEstimateRow[];
}

export interface CalculatedEstimateSection {
  readonly id: string;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly rows: readonly CalculatedEstimateRow[];
}

export interface CalculatedEstimate {
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
  readonly sections: readonly CalculatedEstimateSection[];
}
