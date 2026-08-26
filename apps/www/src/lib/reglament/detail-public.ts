import type {
  EstimateDetailControlSource,
  EstimateDetailCostBucket,
  EstimateDetailResourceKind,
  EstimateDetailSourcePdf,
} from './detail-schema';

export const ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION = '2' as const;

export type PublicEstimateDetailSourceId = `s${number}`;

export interface PublicEstimateDetailQuantityValue {
  readonly value: number | null;
  readonly unit: string | null;
  readonly note?: string;
}

export interface PublicEstimateDetailMoneyValue {
  readonly value: number | null;
  readonly note?: string;
}

export interface PublicEstimateDetailSourceQuoteItem {
  readonly label: string;
  readonly resource_ids?: readonly string[];
  readonly quantity?: PublicEstimateDetailQuantityValue;
  readonly unit_price_rub?: PublicEstimateDetailMoneyValue;
  readonly total_rub?: PublicEstimateDetailMoneyValue;
  readonly note?: string;
}

export interface PublicEstimateDetailSourceValue {
  readonly pdf: EstimateDetailSourcePdf;
  readonly page: number;
  readonly fragment: string;
  readonly quote?: string;
  readonly quote_items?: readonly PublicEstimateDetailSourceQuoteItem[];
  readonly note?: string;
}

export interface PublicEstimateDetailNeedsCheck {
  readonly reason: string;
  readonly source_refs?: readonly PublicEstimateDetailSourceId[];
}

export interface PublicEstimateDetailStatusInfo {
  readonly status?: 'derived' | 'needs_check';
  readonly status_label_ru?: string;
  readonly needs_check?: PublicEstimateDetailNeedsCheck;
}

export interface PublicEstimateDetailWorkItem extends PublicEstimateDetailStatusInfo {
  readonly id: string;
  readonly title: string;
  readonly estimate_row_id: string;
  readonly service_ids?: readonly string[];
  readonly source_refs: readonly PublicEstimateDetailSourceId[];
  readonly note?: string;
}

export interface PublicEstimateDetailResource extends PublicEstimateDetailStatusInfo {
  readonly id: string;
  readonly work_item_id: string;
  readonly estimate_row_id: string;
  readonly kind: EstimateDetailResourceKind;
  readonly title: string;
  readonly cost_bucket: EstimateDetailCostBucket;
  readonly quantity?: PublicEstimateDetailQuantityValue;
  readonly unit_price_rub?: PublicEstimateDetailMoneyValue;
  readonly total_rub: PublicEstimateDetailMoneyValue;
  readonly source_refs: readonly PublicEstimateDetailSourceId[];
  readonly note?: string;
}

export interface PublicEstimateDetailControlTotal extends PublicEstimateDetailStatusInfo {
  readonly id: string;
  readonly estimate_row_id: string;
  readonly control_source: EstimateDetailControlSource;
  readonly cost_bucket: EstimateDetailCostBucket;
  readonly source_total_rub: PublicEstimateDetailMoneyValue;
  readonly detail_total_rub?: PublicEstimateDetailMoneyValue;
  readonly aggregate_total_rub?: PublicEstimateDetailMoneyValue;
  readonly delta_rub?: number;
  readonly tolerance_rub?: number;
  readonly resource_ids?: readonly string[];
  readonly source_refs: readonly PublicEstimateDetailSourceId[];
  readonly note?: string;
}

export interface PublicEstimateDetailDataset {
  readonly schema_version: typeof ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION;
  readonly dataset_id: 'estimate-details-2026';
  readonly title: string;
  readonly year: 2026;
  readonly source_pdfs: readonly {
    readonly pdf: EstimateDetailSourcePdf;
    readonly title: string;
    readonly pages_total?: number;
  }[];
  readonly sources: Readonly<
    Record<PublicEstimateDetailSourceId, PublicEstimateDetailSourceValue>
  >;
  readonly curation_notes: readonly string[];
  readonly work_items: readonly PublicEstimateDetailWorkItem[];
  readonly resources: readonly PublicEstimateDetailResource[];
  readonly control_totals: readonly PublicEstimateDetailControlTotal[];
}
