import type {
  FullReglamentAuditNote,
  FullReglamentCalculationAssumption,
  FullReglamentCommonAsset,
  FullReglamentDataset,
  FullReglamentQuantityValue,
  FullReglamentService,
  FullReglamentServiceToEstimateMapItem,
  FullReglamentSourceRef,
  FullReglamentVillage,
} from './full-schema';
import type {
  PublicFullReglamentAuditNote,
  PublicFullReglamentCalculationAssumption,
  PublicFullReglamentCommonAsset,
  PublicFullReglamentDataset,
  PublicFullReglamentQuantityValue,
  PublicFullReglamentService,
  PublicFullReglamentServiceToEstimateMapItem,
  PublicFullReglamentSourceRef,
  PublicFullReglamentVillage,
} from './full-public';

const projectSourceRef = (
  sourceRef: FullReglamentSourceRef,
): PublicFullReglamentSourceRef => ({
  pdf: sourceRef.pdf,
  page: sourceRef.page,
  fragment: sourceRef.fragment,
  quote: sourceRef.quote,
  note: sourceRef.note,
});

const projectSourceRefs = (
  sourceRefs: readonly FullReglamentSourceRef[],
): readonly PublicFullReglamentSourceRef[] => sourceRefs.map(projectSourceRef);

const projectQuantity = (
  quantity: FullReglamentQuantityValue,
): PublicFullReglamentQuantityValue => ({
  raw: quantity.raw,
  value: quantity.value,
  status: quantity.status,
});

const projectVillage = (
  village: FullReglamentVillage,
): PublicFullReglamentVillage => ({
  id: village.id,
  title: village.title,
  households_count: village.households_count,
  land_area_sotka: village.land_area_sotka,
  land_area_share_percent: village.land_area_share_percent,
  land_area_share_kind: village.land_area_share_kind,
  source_refs: projectSourceRefs(village.source_refs),
  verification_note: village.verification_note,
});

const projectCommonAsset = (
  asset: FullReglamentCommonAsset,
): PublicFullReglamentCommonAsset => ({
  id: asset.id,
  category: asset.category,
  title: asset.title,
  unit: asset.unit,
  values_by_village: {
    'shelkovo-village': projectQuantity(
      asset.values_by_village['shelkovo-village'],
    ),
    'shelkovo-forest': projectQuantity(
      asset.values_by_village['shelkovo-forest'],
    ),
    'shelkovo-park': projectQuantity(asset.values_by_village['shelkovo-park']),
    'shelkovo-river': projectQuantity(
      asset.values_by_village['shelkovo-river'],
    ),
  },
  total: projectQuantity(asset.total),
  total_mode: asset.total_mode,
  source_refs: projectSourceRefs(asset.source_refs),
  verification_note: asset.verification_note,
});

const projectService = (
  service: FullReglamentService,
): PublicFullReglamentService => ({
  id: service.id,
  group: service.group,
  title: service.title,
  frequency_raw: service.frequency_raw,
  frequency_note: service.frequency_note,
  source_refs: projectSourceRefs(service.source_refs),
  quote: service.quote,
});

const projectServiceToEstimateMapItem = (
  item: FullReglamentServiceToEstimateMapItem,
): PublicFullReglamentServiceToEstimateMapItem => ({
  service_id: item.service_id,
  status: item.status,
  status_label_ru: item.status_label_ru,
  estimate_section_ids: [...item.estimate_section_ids],
  estimate_row_ids: [...item.estimate_row_ids],
  source_refs: projectSourceRefs(item.source_refs),
  estimate_source_refs: projectSourceRefs(item.estimate_source_refs),
  explanation: item.explanation,
  verification_note: item.verification_note,
});

const projectCalculationAssumption = (
  assumption: FullReglamentCalculationAssumption,
): PublicFullReglamentCalculationAssumption => ({
  id: assumption.id,
  title: assumption.title,
  summary: assumption.summary,
  status_label_ru: assumption.status_label_ru,
  why_important: assumption.why_important,
  how_to_verify: assumption.how_to_verify,
  related_fact_ids: [...assumption.related_fact_ids],
  source_refs: projectSourceRefs(assumption.source_refs),
  quotes: [...assumption.quotes],
});

const projectAuditNote = (
  auditNote: FullReglamentAuditNote,
): PublicFullReglamentAuditNote => ({
  id: auditNote.id,
  category: auditNote.category,
  title: auditNote.title,
  summary: auditNote.summary,
  public_wording: auditNote.public_wording,
  severity: auditNote.severity,
  related_fact_ids: [...auditNote.related_fact_ids],
  source_refs: projectSourceRefs(auditNote.source_refs),
  next_step: auditNote.next_step,
});

export const projectPublicFullReglamentDataset = (
  dataset: FullReglamentDataset,
): PublicFullReglamentDataset => {
  if (
    dataset.schema_version !== '1' ||
    dataset.dataset_id !== 'full-reglament-2026'
  ) {
    throw new Error('Unsupported full reglament public dataset identity');
  }

  return {
    schema_version: dataset.schema_version,
    dataset_id: dataset.dataset_id,
    title: dataset.title,
    source_pdf: {
      pdf: dataset.source_pdf.pdf,
      title: dataset.source_pdf.title,
      pages_total: dataset.source_pdf.pages_total,
    },
    curation_sources: [...dataset.curation_sources],
    tariff_summary: {
      tariff_area_sotka: dataset.tariff_summary.tariff_area_sotka,
      total_annual_cost_rub: dataset.tariff_summary.total_annual_cost_rub,
      tariff_rub_per_sotka_month:
        dataset.tariff_summary.tariff_rub_per_sotka_month,
      source_refs: projectSourceRefs(dataset.tariff_summary.source_refs),
    },
    villages: dataset.villages.map(projectVillage),
    common_assets: dataset.common_assets.map(projectCommonAsset),
    services: dataset.services.map(projectService),
    service_to_estimate_map: dataset.service_to_estimate_map.map(
      projectServiceToEstimateMapItem,
    ),
    calculation_assumptions: dataset.calculation_assumptions.map(
      projectCalculationAssumption,
    ),
    audit_notes: dataset.audit_notes.map(projectAuditNote),
  };
};
