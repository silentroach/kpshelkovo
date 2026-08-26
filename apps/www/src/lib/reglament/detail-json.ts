import type {
  EstimateDetailDataset,
  EstimateDetailMoneyValue,
  EstimateDetailNeedsCheck,
  EstimateDetailQuantityValue,
  EstimateDetailSourceRef,
} from './detail-schema';
import type {
  PublicEstimateDetailDataset,
  PublicEstimateDetailMoneyValue,
  PublicEstimateDetailNeedsCheck,
  PublicEstimateDetailQuantityValue,
  PublicEstimateDetailSourceId,
  PublicEstimateDetailSourceValue,
} from './detail-public';

const publicQuantity = (
  value: EstimateDetailQuantityValue,
): PublicEstimateDetailQuantityValue => ({
  value: value.value,
  unit: value.unit,
  note: value.note,
});

const publicMoney = (
  value: EstimateDetailMoneyValue,
): PublicEstimateDetailMoneyValue => ({
  value: value.value,
  note: value.note,
});

const publicSource = (
  ref: EstimateDetailSourceRef,
): PublicEstimateDetailSourceValue => ({
  pdf: ref.pdf,
  page: ref.page,
  fragment: ref.fragment,
  quote: ref.quote_items ? undefined : ref.quote,
  quote_items: ref.quote_items?.map((item) => ({
    label: item.label,
    resource_ids: item.resource_ids,
    quantity: item.quantity ? publicQuantity(item.quantity) : undefined,
    unit_price_rub: item.unit_price_rub
      ? publicMoney(item.unit_price_rub)
      : undefined,
    total_rub: item.total_rub ? publicMoney(item.total_rub) : undefined,
    note: item.note,
  })),
  note: ref.note,
});

export const buildPublicEstimateDetails2026Json = (
  dataset: EstimateDetailDataset,
): string => {
  const sourceIdsByKey = new Map<string, PublicEstimateDetailSourceId>();
  const sourcesById = new Map<
    PublicEstimateDetailSourceId,
    PublicEstimateDetailSourceValue
  >();
  const sourceIds = (
    refs: readonly EstimateDetailSourceRef[],
  ): readonly PublicEstimateDetailSourceId[] =>
    refs.map((ref) => {
      const source = publicSource(ref);
      const sourceKey = JSON.stringify(source);
      const existingId = sourceIdsByKey.get(sourceKey);

      if (existingId) return existingId;

      const id: PublicEstimateDetailSourceId = `s${sourcesById.size + 1}`;

      sourceIdsByKey.set(sourceKey, id);
      sourcesById.set(id, source);

      return id;
    });
  const needsCheck = (
    value?: EstimateDetailNeedsCheck,
  ): PublicEstimateDetailNeedsCheck | undefined => {
    if (!value) return;

    return {
      reason: value.reason,
      source_refs: value.source_refs ? sourceIds(value.source_refs) : undefined,
    };
  };
  const workItems = dataset.work_items.map((item) => ({
    id: item.id,
    title: item.title,
    estimate_row_id: item.estimate_row_id,
    service_ids: item.service_ids,
    source_refs: sourceIds(item.source_refs),
    note: item.note,
    status: item.status === 'verified' ? undefined : item.status,
    status_label_ru:
      item.status === 'verified' ? undefined : item.status_label_ru,
    needs_check: needsCheck(item.needs_check),
  }));
  const resources = dataset.resources.map((resource) => ({
    id: resource.id,
    work_item_id: resource.work_item_id,
    estimate_row_id: resource.estimate_row_id,
    kind: resource.kind,
    title: resource.title,
    cost_bucket: resource.cost_bucket,
    quantity: resource.quantity ? publicQuantity(resource.quantity) : undefined,
    unit_price_rub: resource.unit_price_rub
      ? publicMoney(resource.unit_price_rub)
      : undefined,
    total_rub: publicMoney(resource.total_rub),
    source_refs: sourceIds(resource.source_refs),
    note: resource.note,
    status: resource.status === 'verified' ? undefined : resource.status,
    status_label_ru:
      resource.status === 'verified' ? undefined : resource.status_label_ru,
    needs_check: needsCheck(resource.needs_check),
  }));
  const controlTotals = dataset.control_totals.map((controlTotal) => ({
    id: controlTotal.id,
    estimate_row_id: controlTotal.estimate_row_id,
    control_source: controlTotal.control_source,
    cost_bucket: controlTotal.cost_bucket,
    source_total_rub: publicMoney(controlTotal.source_total_rub),
    detail_total_rub: controlTotal.detail_total_rub
      ? publicMoney(controlTotal.detail_total_rub)
      : undefined,
    aggregate_total_rub: controlTotal.aggregate_total_rub
      ? publicMoney(controlTotal.aggregate_total_rub)
      : undefined,
    delta_rub: controlTotal.delta_rub,
    tolerance_rub: controlTotal.tolerance_rub,
    resource_ids: controlTotal.resource_ids,
    source_refs: sourceIds(controlTotal.source_refs),
    note: controlTotal.note,
    status:
      controlTotal.status === 'verified' ? undefined : controlTotal.status,
    status_label_ru:
      controlTotal.status === 'verified'
        ? undefined
        : controlTotal.status_label_ru,
    needs_check: needsCheck(controlTotal.needs_check),
  }));
  const publicDataset: PublicEstimateDetailDataset = {
    schema_version: '2',
    dataset_id: dataset.dataset_id,
    title: dataset.title,
    year: dataset.year,
    source_pdfs: dataset.source_pdfs.map((sourcePdf) => ({
      pdf: sourcePdf.pdf,
      title: sourcePdf.title,
      pages_total: sourcePdf.pages_total,
    })),
    sources: Object.fromEntries(sourcesById),
    curation_notes: dataset.curation_notes,
    work_items: workItems,
    resources,
    control_totals: controlTotals,
  };

  return JSON.stringify(publicDataset);
};
