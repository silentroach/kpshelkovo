export type PublicFullReglamentVillageId =
  'shelkovo-village' | 'shelkovo-forest' | 'shelkovo-park' | 'shelkovo-river';

export type PublicFullReglamentQuantityStatus =
  | 'present'
  | 'empty_cell'
  | 'sum_explicit_values'
  | 'not_summed'
  | 'group_row'
  | 'requires_visual_check';

export interface PublicFullReglamentSourceRef {
  readonly pdf: 'full';
  readonly page: number;
  readonly fragment: string;
  readonly quote?: string;
  readonly note?: string;
}

export interface PublicFullReglamentQuantityValue {
  readonly raw: string;
  readonly value: number | null;
  readonly status: PublicFullReglamentQuantityStatus;
}

export interface PublicFullReglamentVillage {
  readonly id: PublicFullReglamentVillageId;
  readonly title: string;
  readonly households_count: number;
  readonly land_area_sotka: number;
  readonly land_area_share_percent: number;
  readonly land_area_share_kind: 'calculated_from_pdf';
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly verification_note: string | null;
}

export interface PublicFullReglamentCommonAsset {
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
  readonly values_by_village: Readonly<
    Record<PublicFullReglamentVillageId, PublicFullReglamentQuantityValue>
  >;
  readonly total: PublicFullReglamentQuantityValue;
  readonly total_mode:
    'sum_explicit_values' | 'not_summed' | 'empty' | 'group_row';
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly verification_note: string | null;
}

export interface PublicFullReglamentService {
  readonly id: string;
  readonly group: 'year_round' | 'winter_period' | 'summer_period';
  readonly title: string;
  readonly frequency_raw: string;
  readonly frequency_note: string | null;
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly quote?: string;
}

export interface PublicFullReglamentServiceToEstimateMapItem {
  readonly service_id: string;
  readonly status: 'explicit_found' | 'partial' | 'not_found' | 'needs_check';
  readonly status_label_ru: string;
  readonly estimate_section_ids: readonly string[];
  readonly estimate_row_ids: readonly string[];
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly estimate_source_refs: readonly PublicFullReglamentSourceRef[];
  readonly explanation: string;
  readonly verification_note: string | null;
}

export interface PublicFullReglamentCalculationAssumption {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly status_label_ru: string;
  readonly why_important: string;
  readonly how_to_verify: string;
  readonly related_fact_ids: readonly string[];
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly quotes: readonly string[];
}

export interface PublicFullReglamentAuditNote {
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
  readonly source_refs: readonly PublicFullReglamentSourceRef[];
  readonly next_step: string;
}

export interface PublicFullReglamentDataset {
  readonly schema_version: '1';
  readonly dataset_id: 'full-reglament-2026';
  readonly title: string;
  readonly source_pdf: {
    readonly pdf: 'full';
    readonly title: string;
    readonly pages_total: number;
  };
  readonly curation_sources: readonly string[];
  readonly tariff_summary: {
    readonly tariff_area_sotka: number;
    readonly total_annual_cost_rub: number;
    readonly tariff_rub_per_sotka_month: number;
    readonly source_refs: readonly PublicFullReglamentSourceRef[];
  };
  readonly villages: readonly PublicFullReglamentVillage[];
  readonly common_assets: readonly PublicFullReglamentCommonAsset[];
  readonly services: readonly PublicFullReglamentService[];
  readonly service_to_estimate_map: readonly PublicFullReglamentServiceToEstimateMapItem[];
  readonly calculation_assumptions: readonly PublicFullReglamentCalculationAssumption[];
  readonly audit_notes: readonly PublicFullReglamentAuditNote[];
}
