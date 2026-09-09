export const ESTIMATE_SOURCE_PDFS = [
  'final',
  'cleaning',
  'landscaping',
  'improvement',
  'lighting',
  'security',
  'waste'
] as const;

export type EstimateSourcePdf = (typeof ESTIMATE_SOURCE_PDFS)[number];

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export const ESTIMATE_ROW_KINDS = ['work', 'group', 'resource', 'material', 'contractor'] as const;

export type EstimateRowKind = (typeof ESTIMATE_ROW_KINDS)[number];

export const ESTIMATE_COEFFICIENT_POLICIES = ['fot', 'none'] as const;

export type EstimateCoefficientPolicy = (typeof ESTIMATE_COEFFICIENT_POLICIES)[number];

export const EDITABLE_FIELD_KEYS = [
  'enabled',
  'volume',
  'frequency',
  'rate',
  'fixed_price',
  'primary_salary',
  'machinist_salary',
  'machines',
  'materials',
  'contractors',
  'insurance_rate',
  'overhead_rate',
  'profit_rate',
  'usn_rate',
  'vat_rate'
] as const;

export type EditableFieldKey = (typeof EDITABLE_FIELD_KEYS)[number];

export const EDITABLE_FIELD_LEVELS = ['basic', 'expert'] as const;

export type EditableFieldLevel = (typeof EDITABLE_FIELD_LEVELS)[number];

export interface EstimateSourceRef {
  readonly pdf: EstimateSourcePdf;
  readonly page: number;
  readonly fragment?: string;
  readonly note?: string;
}

export interface EditableField {
  readonly key: EditableFieldKey;
  readonly label: string;
  readonly level: EditableFieldLevel;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface EstimateCoefficients {
  readonly insurance_rate: number;
  readonly overhead_rate: number;
  readonly profit_rate: number;
  readonly usn_rate: number;
  readonly vat_rate: number;
}

export interface EstimateDisplayValue {
  readonly value: number;
  readonly unit: string;
  readonly label?: string;
}

export interface CostBreakdown {
  readonly primary_salary: number;
  readonly machinist_salary: number;
  readonly fot: number;
  readonly machines: number;
  readonly materials: number;
  readonly contractors: number;
  readonly insurance: number;
  readonly overhead: number;
  readonly profit: number;
  readonly usn: number;
  readonly income: number;
  readonly vat: number;
  readonly gross: number;
}

export interface EstimateRowBaseline {
  readonly is_enabled: boolean;
  readonly base?: EstimateDisplayValue;
  readonly frequency?: EstimateDisplayValue;
  readonly price?: EstimateDisplayValue;
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly breakdown: CostBreakdown;
}

export interface EstimateRow {
  readonly id: string;
  readonly title: string;
  readonly kind: EstimateRowKind;
  readonly coefficient_policy: EstimateCoefficientPolicy;
  readonly baseline: EstimateRowBaseline;
  readonly source_refs: NonEmptyReadonlyArray<EstimateSourceRef>;
  readonly editable_fields: readonly EditableField[];
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly children?: readonly EstimateRow[];
}

export interface EstimateSectionBaseline {
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
}

export interface EstimateSection {
  readonly id: string;
  readonly title: string;
  readonly baseline: EstimateSectionBaseline;
  readonly source_refs: NonEmptyReadonlyArray<EstimateSourceRef>;
  readonly rows: readonly EstimateRow[];
}

export interface EstimateBaseline {
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
}

export interface Estimate {
  readonly id: string;
  readonly year: number;
  readonly title: string;
  readonly tariff_area_sotki: number;
  readonly coefficients: EstimateCoefficients;
  readonly baseline: EstimateBaseline;
  readonly source_refs: NonEmptyReadonlyArray<EstimateSourceRef>;
  readonly sections: readonly EstimateSection[];
}
