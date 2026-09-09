type FullSourcePdf = 'full';

export type FullReglamentSourceRef = {
  readonly pdf: FullSourcePdf;
  readonly page: number;
  readonly fragment: string;
  readonly quote?: string;
  readonly note?: string;
};

export type FullReglamentVillageId =
  | 'shelkovo-village'
  | 'shelkovo-forest'
  | 'shelkovo-park'
  | 'shelkovo-river';

export type FullReglamentQuantityStatus =
  | 'present'
  | 'empty_cell'
  | 'sum_explicit_values'
  | 'not_summed'
  | 'group_row'
  | 'requires_visual_check';

export type FullReglamentQuantityValue = {
  readonly raw: string;
  readonly value: number | null;
  readonly status: FullReglamentQuantityStatus;
};

export type FullReglamentCommonAsset = {
  readonly id: string;
  readonly category:
    | 'roads'
    | 'stormwater'
    | 'greenery'
    | 'forest'
    | 'improvement'
    | 'electricity'
    | 'security';
  readonly title: string;
  readonly unit: string | null;
  readonly values_by_village: Readonly<Record<FullReglamentVillageId, FullReglamentQuantityValue>>;
  readonly total: FullReglamentQuantityValue;
  readonly total_mode: 'sum_explicit_values' | 'not_summed' | 'empty' | 'group_row';
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly verification_note: string | null;
};

export type FullReglamentService = {
  readonly id: string;
  readonly group: 'year_round' | 'winter_period' | 'summer_period';
  readonly title: string;
  readonly frequency_raw: string;
  readonly frequency_note: string | null;
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly quote?: string;
};

export type FullReglamentServiceToEstimateMapItem = {
  readonly service_id: string;
  readonly status: 'explicit_found' | 'partial' | 'not_found' | 'needs_check';
  readonly status_label_ru: string;
  readonly estimate_section_ids: readonly string[];
  readonly estimate_row_ids: readonly string[];
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly estimate_source_refs: readonly FullReglamentSourceRef[];
  readonly explanation: string;
  readonly verification_note: string | null;
};

export type FullReglamentVillage = {
  readonly id: FullReglamentVillageId;
  readonly title: string;
  readonly households_count: number;
  readonly land_area_sotka: number;
  readonly land_area_share_percent: number;
  readonly land_area_share_kind: 'calculated_from_pdf';
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly verification_note: string | null;
};

export type FullReglamentCalculationAssumption = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly status_label_ru: string;
  readonly why_important: string;
  readonly how_to_verify: string;
  readonly related_fact_ids: readonly string[];
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly quotes: readonly string[];
};

export type FullReglamentAuditNote = {
  readonly id: string;
  readonly category:
    | 'data_quality'
    | 'estimate_mapping'
    | 'calculation_check'
    | 'source_verification';
  readonly title: string;
  readonly summary: string;
  readonly public_wording: string;
  readonly severity: 'info' | 'watch' | 'needs_check';
  readonly related_fact_ids: readonly string[];
  readonly source_refs: readonly FullReglamentSourceRef[];
  readonly next_step: string;
};

export type FullReglamentDataset = {
  readonly schema_version: string;
  readonly dataset_id: string;
  readonly title: string;
  readonly source_pdf: {
    readonly pdf: FullSourcePdf;
    readonly title: string;
    readonly pages_total: number;
  };
  readonly curation_sources: readonly string[];
  readonly tariff_summary: {
    readonly tariff_area_sotka: number;
    readonly total_annual_cost_rub: number;
    readonly tariff_rub_per_sotka_month: number;
    readonly source_refs: readonly FullReglamentSourceRef[];
  };
  readonly villages: readonly FullReglamentVillage[];
  readonly common_assets: readonly FullReglamentCommonAsset[];
  readonly services: readonly FullReglamentService[];
  readonly service_to_estimate_map: readonly FullReglamentServiceToEstimateMapItem[];
  readonly calculation_assumptions: readonly FullReglamentCalculationAssumption[];
  readonly audit_notes: readonly FullReglamentAuditNote[];
};
