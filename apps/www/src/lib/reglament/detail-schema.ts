import {
  ESTIMATE_SOURCE_PDFS,
  type EstimateSourcePdf,
  type NonEmptyReadonlyArray,
} from './schema';

export const ESTIMATE_DETAIL_SOURCE_PDFS = ESTIMATE_SOURCE_PDFS;

export type EstimateDetailSourcePdf = EstimateSourcePdf;

export type EstimateDetailWorkItemId = string;
export type EstimateDetailResourceId = string;
export type EstimateDetailControlTotalId = string;
export type EstimateRowId = string;
export type FullReglamentServiceId = string;

export const ESTIMATE_DETAIL_RESOURCE_KINDS = [
  'labor',
  'machinist_labor',
  'machine',
  'material',
  'contractor',
  'other_cost',
] as const;

export type EstimateDetailResourceKind =
  (typeof ESTIMATE_DETAIL_RESOURCE_KINDS)[number];

export const ESTIMATE_DETAIL_COST_BUCKETS = [
  'primary_salary',
  'machinist_salary',
  'fot',
  'machines',
  'materials',
  'contractors',
  'insurance',
  'overhead',
  'profit',
  'usn',
  'income',
  'vat',
  'gross',
  'other_cost',
] as const;

export type EstimateDetailCostBucket =
  (typeof ESTIMATE_DETAIL_COST_BUCKETS)[number];

export const ESTIMATE_DETAIL_STATUSES = [
  'verified',
  'derived',
  'needs_check',
] as const;

export type EstimateDetailStatus = (typeof ESTIMATE_DETAIL_STATUSES)[number];

export const ESTIMATE_DETAIL_CONTROL_SOURCES = [
  'section_pdf',
  'final_pdf',
] as const;

export type EstimateDetailControlSource =
  (typeof ESTIMATE_DETAIL_CONTROL_SOURCES)[number];

export interface EstimateDetailSourceQuoteItem {
  readonly label: string;
  readonly resource_ids?: readonly EstimateDetailResourceId[];
  readonly quantity?: EstimateDetailQuantityValue;
  readonly unit_price_rub?: EstimateDetailMoneyValue;
  readonly total_rub?: EstimateDetailMoneyValue;
  readonly note?: string;
}

export interface EstimateDetailSourceRef {
  readonly pdf: EstimateDetailSourcePdf;
  readonly page: number;
  readonly fragment: string;
  readonly quote?: string;
  readonly quote_items?: NonEmptyReadonlyArray<EstimateDetailSourceQuoteItem>;
  readonly note?: string;
}

export interface EstimateDetailSourcePdfInfo {
  readonly pdf: EstimateDetailSourcePdf;
  readonly title: string;
  readonly pages_total?: number;
}

export interface EstimateDetailQuantityValue {
  readonly value: number | null;
  readonly unit: string | null;
  readonly note?: string;
}

export interface EstimateDetailMoneyValue {
  readonly value: number | null;
  readonly note?: string;
}

export type EstimateDetailUnknownMoneyValue = Omit<
  EstimateDetailMoneyValue,
  'value'
> & {
  readonly value: null;
};

export interface EstimateDetailNeedsCheck {
  readonly reason: string;
  readonly source_refs?: readonly EstimateDetailSourceRef[];
}

export type EstimateDetailStatusInfo =
  | {
      readonly status: Exclude<EstimateDetailStatus, 'needs_check'>;
      readonly status_label_ru: string;
      readonly needs_check?: never;
    }
  | {
      readonly status: 'needs_check';
      readonly status_label_ru: string;
      readonly needs_check: EstimateDetailNeedsCheck;
    };

export type EstimateDetailWorkItem = {
  readonly id: EstimateDetailWorkItemId;
  readonly title: string;
  readonly estimate_row_id: EstimateRowId;
  readonly service_ids?: readonly FullReglamentServiceId[];
  readonly source_refs: NonEmptyReadonlyArray<EstimateDetailSourceRef>;
  readonly note?: string;
} & EstimateDetailStatusInfo;

export type EstimateDetailResource = {
  readonly id: EstimateDetailResourceId;
  readonly work_item_id: EstimateDetailWorkItemId;
  readonly estimate_row_id: EstimateRowId;
  readonly kind: EstimateDetailResourceKind;
  readonly title: string;
  readonly cost_bucket: EstimateDetailCostBucket;
  readonly quantity?: EstimateDetailQuantityValue;
  readonly unit_price_rub?: EstimateDetailMoneyValue;
  readonly total_rub: EstimateDetailMoneyValue;
  readonly source_refs: NonEmptyReadonlyArray<EstimateDetailSourceRef>;
  readonly note?: string;
} & EstimateDetailStatusInfo;

export type EstimateDetailControlTotalBase = {
  readonly id: EstimateDetailControlTotalId;
  readonly estimate_row_id: EstimateRowId;
  readonly control_source: EstimateDetailControlSource;
  readonly cost_bucket: EstimateDetailCostBucket;
  readonly source_total_rub: EstimateDetailMoneyValue;
  readonly detail_total_rub?: EstimateDetailMoneyValue;
  readonly aggregate_total_rub?: EstimateDetailMoneyValue;
  readonly delta_rub?: number;
  readonly tolerance_rub?: number;
  readonly resource_ids?: readonly EstimateDetailResourceId[];
  readonly source_refs: NonEmptyReadonlyArray<EstimateDetailSourceRef>;
  readonly note?: string;
};

export type EstimateDetailControlTotalInput = Omit<
  EstimateDetailControlTotalBase,
  | 'control_source'
  | 'detail_total_rub'
  | 'aggregate_total_rub'
  | 'delta_rub'
  | 'tolerance_rub'
  | 'resource_ids'
> & {
  readonly control_source?: 'section_pdf';
  readonly detail_total_note?: string;
  readonly aggregate_total_unknown?: EstimateDetailUnknownMoneyValue;
  readonly tolerance_rub: number;
  readonly resource_ids: NonEmptyReadonlyArray<EstimateDetailResourceId>;
} & EstimateDetailStatusInfo;

export type EstimateDetailControlTotal = EstimateDetailControlTotalBase &
  EstimateDetailStatusInfo;

export interface EstimateDetailDataset {
  readonly schema_version: string;
  readonly dataset_id: 'estimate-details-2026';
  readonly title: string;
  readonly year: 2026;
  readonly source_pdfs: readonly EstimateDetailSourcePdfInfo[];
  readonly curation_notes: readonly string[];
  readonly work_items: readonly EstimateDetailWorkItem[];
  readonly resources: readonly EstimateDetailResource[];
  readonly control_totals: readonly EstimateDetailControlTotal[];
}
