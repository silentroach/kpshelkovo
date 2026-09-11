import { describe, expect, it } from 'vitest';

import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';
import {
  wasteControlTotals,
  wasteResources,
  wasteWorkItems
} from '@/data/reglament/estimate-details-2026/waste';

const sectionControlTotals = resolveSectionControlTotals(wasteControlTotals, wasteResources);
const resourcesById = new Map(wasteResources.map((resource) => [resource.id, resource]));

describe('estimate details 2026 waste', () => {
  it('captures waste details from waste.pdf', () => {
    const wasteRowIds = new Set(['waste-operator-service', 'waste-transfer-from-homes']);
    const workItems = wasteWorkItems
      .filter((item) => wasteRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = wasteResources
      .filter((resource) => wasteRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status
      }));
    const controlTotals = sectionControlTotals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          wasteRowIds.has(controlTotal.estimate_row_id)
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status
      }));

    expect({ workItems, resources, controlTotals }).toMatchInlineSnapshot(`
      {
        "controlTotals": [
          {
            "aggregate_total_rub": 7623207.58,
            "cost_bucket": "contractors",
            "id": "waste-operator-contractors",
            "source_total_rub": 7623207.58,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 7623207.58,
            "cost_bucket": "income",
            "id": "waste-operator-income",
            "source_total_rub": 7623208,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 8004368,
            "cost_bucket": "gross",
            "id": "waste-operator-gross",
            "source_total_rub": 8004367.96,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 0,
            "cost_bucket": "materials",
            "id": "waste-operator-materials-calculation-conflict",
            "source_total_rub": 7623208,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 3418555.1,
            "cost_bucket": "primary_salary",
            "id": "waste-transfer-primary-salary",
            "source_total_rub": 3418555.1,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1364107.2,
            "cost_bucket": "machinist_salary",
            "id": "waste-transfer-machinist-salary",
            "source_total_rub": 1364107.2,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 464303.42,
            "cost_bucket": "machines",
            "id": "waste-transfer-machines",
            "source_total_rub": 464303.42,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1444364.01,
            "cost_bucket": "insurance",
            "id": "waste-transfer-insurance",
            "source_total_rub": 1444364.01,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 3347863.61,
            "cost_bucket": "overhead",
            "id": "waste-transfer-overhead",
            "source_total_rub": 3347863.61,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1913064.92,
            "cost_bucket": "profit",
            "id": "waste-transfer-profit",
            "source_total_rub": 1913064.92,
            "status": "verified",
          },
          {
            "aggregate_total_rub": null,
            "cost_bucket": "usn",
            "id": "waste-transfer-usn",
            "source_total_rub": 286960,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 12851178,
            "cost_bucket": "gross",
            "id": "waste-transfer-gross",
            "source_total_rub": 12851177.85,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "contractors",
            "id": "waste-operator-regional-operator-service",
            "kind": "contractor",
            "status": "needs_check",
            "total_rub": 7623207.58,
          },
          {
            "cost_bucket": "materials",
            "id": "waste-operator-materials-calculation-row",
            "kind": "material",
            "status": "needs_check",
            "total_rub": 7623208,
          },
          {
            "cost_bucket": "vat",
            "id": "waste-operator-vat",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 381160.38,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "waste-transfer-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 3418555.1,
          },
          {
            "cost_bucket": "machinist_salary",
            "id": "waste-transfer-machinist-labor",
            "kind": "machinist_labor",
            "status": "verified",
            "total_rub": 1364107.2,
          },
          {
            "cost_bucket": "machines",
            "id": "waste-transfer-gazel-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 464303.42,
          },
          {
            "cost_bucket": "insurance",
            "id": "waste-transfer-worker-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1032403.64,
          },
          {
            "cost_bucket": "insurance",
            "id": "waste-transfer-machinist-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 411960.37,
          },
          {
            "cost_bucket": "overhead",
            "id": "waste-transfer-worker-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 2392988.57,
          },
          {
            "cost_bucket": "overhead",
            "id": "waste-transfer-machinist-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 954875.04,
          },
          {
            "cost_bucket": "profit",
            "id": "waste-transfer-worker-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1367422.04,
          },
          {
            "cost_bucket": "profit",
            "id": "waste-transfer-machinist-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 545642.88,
          },
          {
            "cost_bucket": "usn",
            "id": "waste-transfer-usn",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 286960,
          },
          {
            "cost_bucket": "vat",
            "id": "waste-transfer-vat-document",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 597612.91,
          },
          {
            "cost_bucket": "vat",
            "id": "waste-transfer-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 611960.85,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "waste-operator-service",
            "id": "waste-operator-service",
            "service_ids": [
              "year-round-solid-waste-removal",
            ],
            "status": "verified",
          },
          {
            "estimate_row_id": "waste-transfer-from-homes",
            "id": "waste-transfer-from-homes",
            "service_ids": [
              "year-round-private-bins-cleaning",
              "year-round-solid-waste-removal",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });

  it('exposes structured source quote items beside legacy quote text', () => {
    const sourceRef = resourcesById
      .get('waste-transfer-worker-labor')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'waste' &&
          ref.page === 12 &&
          ref.fragment === 'ресурсная ведомость по локальному ресурсному сметному расчету'
      );

    expect(sourceRef?.quote).toBe(
      'Рабочий ... 5147,3 664,15 3 418 555,10; Машинист 1460,0 934,32 1 364 107,20; Газель (GAZ 330232) 1460,0 318,02 464 303,42'
    );
    expect(sourceRef?.quote_items).toMatchInlineSnapshot(`
      [
        {
          "label": "Рабочий по уборке территории",
          "quantity": {
            "unit": "чел-час",
            "value": 5147.3,
          },
          "resource_ids": [
            "waste-transfer-worker-labor",
          ],
          "total_rub": {
            "value": 3418555.1,
          },
          "unit_price_rub": {
            "value": 664.15,
          },
        },
        {
          "label": "Машинист",
          "quantity": {
            "unit": "чел-час",
            "value": 1460,
          },
          "resource_ids": [
            "waste-transfer-machinist-labor",
          ],
          "total_rub": {
            "value": 1364107.2,
          },
          "unit_price_rub": {
            "value": 934.32,
          },
        },
        {
          "label": "Газель (GAZ 330232)",
          "quantity": {
            "unit": "маш.-час",
            "value": 1460,
          },
          "resource_ids": [
            "waste-transfer-gazel-machine",
          ],
          "total_rub": {
            "value": 464303.42,
          },
          "unit_price_rub": {
            "value": 318.02,
          },
        },
      ]
    `);
  });

  it('keeps waste quote items enriched with source table fields', () => {
    const staffSource = resourcesById
      .get('waste-transfer-worker-labor')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'waste' &&
          ref.page === 8 &&
          ref.fragment === 'нормативное штатное расписание для перемещения мусора'
      );
    const resourceStatementSource = resourcesById
      .get('waste-transfer-gazel-machine')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'waste' &&
          ref.page === 12 &&
          ref.fragment === 'ресурсная ведомость по локальному ресурсному сметному расчету'
      );

    expect({
      staff: staffSource?.quote_items?.[0],
      resourceStatement: resourceStatementSource?.quote_items?.[2]
    }).toMatchInlineSnapshot(`
      {
        "resourceStatement": {
          "label": "Газель (GAZ 330232)",
          "quantity": {
            "unit": "маш.-час",
            "value": 1460,
          },
          "resource_ids": [
            "waste-transfer-gazel-machine",
          ],
          "total_rub": {
            "value": 464303.42,
          },
          "unit_price_rub": {
            "value": 318.02,
          },
        },
        "staff": {
          "label": "Рабочий по уборке территории",
          "quantity": {
            "unit": "чел.",
            "value": 2.6,
          },
          "resource_ids": [
            "waste-transfer-worker-labor",
          ],
          "total_rub": {
            "note": "колонка «Всего, руб. ((гр. 5 + гр. 6 + гр. 7 + гр. 8) × гр. 4)», не годовая сметная сумма",
            "value": 1726.78,
          },
          "unit_price_rub": {
            "value": 664.15,
          },
        },
      }
    `);
  });
});
