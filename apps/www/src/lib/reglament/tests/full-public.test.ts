import { describe, expect, it } from 'vitest';

import type { PublicFullReglamentSourceRef } from '../full-public';
import { validatePublicFullReglamentDataset } from '../full-public-validator';

const keys = (value: object): readonly string[] => Object.keys(value).sort();

const shape = (value: object): string => keys(value).join(',');

const unique = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort();

const keyVariants = (
  values: readonly PublicFullReglamentSourceRef[],
): readonly string[] => unique(values.map((value) => keys(value).join(',')));

describe('full reglament public contract', () => {
  it('keeps the meaningful full-2026.json shape and values stable', async () => {
    Object.assign(import.meta.env, {
      SITE: 'https://example.com',
      BASE_URL: '/',
    });
    const { GET } =
      await import('../../../pages/815/regulation/data/full-2026.json');
    const response = await GET({} as never);
    const body = await response.text();
    const payload = validatePublicFullReglamentDataset(JSON.parse(body));
    const village = payload.villages[0];
    const asset = payload.common_assets[0];
    const service = payload.services[0];
    const mapping = payload.service_to_estimate_map[0];
    const assumption = payload.calculation_assumptions[0];
    const auditNote = payload.audit_notes[0];

    if (
      !village ||
      !asset ||
      !service ||
      !mapping ||
      !assumption ||
      !auditNote
    ) {
      throw new Error('Full reglament public collections must not be empty');
    }

    const sourceRefs = [
      ...payload.tariff_summary.source_refs,
      ...payload.villages.flatMap((item) => item.source_refs),
      ...payload.common_assets.flatMap((item) => item.source_refs),
      ...payload.services.flatMap((item) => item.source_refs),
      ...payload.service_to_estimate_map.flatMap((item) => [
        ...item.source_refs,
        ...item.estimate_source_refs,
      ]),
      ...payload.calculation_assumptions.flatMap((item) => item.source_refs),
      ...payload.audit_notes.flatMap((item) => item.source_refs),
    ];
    const quantities = payload.common_assets.flatMap((item) => [
      item.total,
      ...Object.values(item.values_by_village),
    ]);

    expect({
      keys: {
        dataset: shape(payload),
        sourcePdf: shape(payload.source_pdf),
        tariffSummary: shape(payload.tariff_summary),
        village: shape(village),
        commonAsset: shape(asset),
        valuesByVillage: shape(asset.values_by_village),
        quantity: shape(asset.total),
        service: shape(service),
        serviceToEstimateMapItem: shape(mapping),
        calculationAssumption: shape(assumption),
        auditNote: shape(auditNote),
        sourceRefVariants: keyVariants(sourceRefs),
      },
      values: {
        schemaVersion: payload.schema_version,
        datasetId: payload.dataset_id,
        sourcePdf: payload.source_pdf,
        tariffSummary: {
          tariffAreaSotka: payload.tariff_summary.tariff_area_sotka,
          totalAnnualCostRub: payload.tariff_summary.total_annual_cost_rub,
          tariffRubPerSotkaMonth:
            payload.tariff_summary.tariff_rub_per_sotka_month,
        },
        collectionSizes: {
          villages: payload.villages.length,
          commonAssets: payload.common_assets.length,
          services: payload.services.length,
          serviceMappings: payload.service_to_estimate_map.length,
          calculationAssumptions: payload.calculation_assumptions.length,
          auditNotes: payload.audit_notes.length,
        },
        villageIds: payload.villages.map((item) => item.id),
        quantityStatuses: unique(quantities.map((item) => item.status)),
        serviceGroups: unique(payload.services.map((item) => item.group)),
        mappingStatuses: unique(
          payload.service_to_estimate_map.map((item) => item.status),
        ),
        auditSeverities: unique(
          payload.audit_notes.map((item) => item.severity),
        ),
        keepsNullForEmptyCell: payload.common_assets.find(
          (item) => item.id === 'roads-parking-sites',
        )?.values_by_village['shelkovo-park'],
        compactJson: body === JSON.stringify(payload),
      },
    }).toMatchInlineSnapshot(`
      {
        "keys": {
          "auditNote": "category,id,next_step,public_wording,related_fact_ids,severity,source_refs,summary,title",
          "calculationAssumption": "how_to_verify,id,quotes,related_fact_ids,source_refs,status_label_ru,summary,title,why_important",
          "commonAsset": "category,id,source_refs,title,total,total_mode,unit,values_by_village,verification_note",
          "dataset": "audit_notes,calculation_assumptions,common_assets,curation_sources,dataset_id,schema_version,service_to_estimate_map,services,source_pdf,tariff_summary,title,villages",
          "quantity": "raw,status,value",
          "service": "frequency_note,frequency_raw,group,id,quote,source_refs,title",
          "serviceToEstimateMapItem": "estimate_row_ids,estimate_section_ids,estimate_source_refs,explanation,service_id,source_refs,status,status_label_ru,verification_note",
          "sourcePdf": "pages_total,pdf,title",
          "sourceRefVariants": [
            "fragment,note,page,pdf",
            "fragment,page,pdf",
            "fragment,page,pdf,quote",
          ],
          "tariffSummary": "source_refs,tariff_area_sotka,tariff_rub_per_sotka_month,total_annual_cost_rub",
          "valuesByVillage": "shelkovo-forest,shelkovo-park,shelkovo-river,shelkovo-village",
          "village": "households_count,id,land_area_share_kind,land_area_share_percent,land_area_sotka,source_refs,title,verification_note",
        },
        "values": {
          "auditSeverities": [
            "info",
            "needs_check",
            "watch",
          ],
          "collectionSizes": {
            "auditNotes": 9,
            "calculationAssumptions": 5,
            "commonAssets": 33,
            "serviceMappings": 24,
            "services": 24,
            "villages": 4,
          },
          "compactJson": true,
          "datasetId": "full-reglament-2026",
          "keepsNullForEmptyCell": {
            "raw": "-",
            "status": "empty_cell",
            "value": null,
          },
          "mappingStatuses": [
            "explicit_found",
            "needs_check",
            "not_found",
            "partial",
          ],
          "quantityStatuses": [
            "empty_cell",
            "group_row",
            "not_summed",
            "present",
            "sum_explicit_values",
          ],
          "schemaVersion": "1",
          "serviceGroups": [
            "summer_period",
            "winter_period",
            "year_round",
          ],
          "sourcePdf": {
            "pages_total": 138,
            "pdf": "full",
            "title": "Полный регламент",
          },
          "tariffSummary": {
            "tariffAreaSotka": 20440.54,
            "tariffRubPerSotkaMonth": 902.07,
            "totalAnnualCostRub": 221264198,
          },
          "villageIds": [
            "shelkovo-village",
            "shelkovo-forest",
            "shelkovo-park",
            "shelkovo-river",
          ],
        },
      }
    `);
  });
});
