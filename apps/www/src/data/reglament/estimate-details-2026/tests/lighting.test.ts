import { describe, expect, it } from 'vitest';

import {
  lightingControlTotals,
  lightingResources,
  lightingWorkItems
} from '@/data/reglament/estimate-details-2026/lighting';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';

const sectionControlTotals = resolveSectionControlTotals(lightingControlTotals, lightingResources);

describe('estimate details 2026 lighting', () => {
  it('marks a section control for review when a resource changes', () => {
    const controlInput = lightingControlTotals.find(
      (controlTotal) => controlTotal.id === 'lighting-street-materials'
    );

    if (!controlInput) throw new Error('lighting materials control is missing');

    const resources = lightingResources.map((resource) =>
      resource.id === controlInput.resource_ids[0]
        ? {
            ...resource,
            total_rub: { ...resource.total_rub, value: 97_000 }
          }
        : resource
    );
    const [controlTotal] = resolveSectionControlTotals([controlInput], resources);

    expect({
      detail_total_rub: controlTotal?.detail_total_rub?.value,
      aggregate_total_rub: controlTotal?.aggregate_total_rub?.value,
      delta_rub: controlTotal?.delta_rub,
      status: controlTotal?.status,
      reason: controlTotal?.needs_check?.reason
    }).toMatchInlineSnapshot(`
      {
        "aggregate_total_rub": 97820,
        "delta_rub": -820,
        "detail_total_rub": 97000,
        "reason": "Контроль не сходится при допуске 0.01 ₽: детализация и источник расходятся на -820 ₽; детализация и агрегированная смета расходятся на -820 ₽.",
        "status": "needs_check",
      }
    `);
  });

  it('keeps lighting quote items enriched with source table fields', () => {
    const resourceStatementSource = lightingResources
      .find((resource) => resource.id === 'lighting-poles-paint-material')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'lighting' &&
          ref.page === 13 &&
          ref.fragment === 'ресурсная ведомость по локальному ресурсному сметному расчету'
      );
    const paintItem = resourceStatementSource?.quote_items?.find(
      (item) => item.label === 'Краска по металлу'
    );

    expect(paintItem).toMatchInlineSnapshot(`
      {
        "label": "Краска по металлу",
        "quantity": {
          "note": "ресурсная ведомость округляет количество; итог сохранен по исходной строке",
          "unit": "кг.",
          "value": 453,
        },
        "resource_ids": [
          "lighting-poles-paint-material",
        ],
        "total_rub": {
          "value": 277692.8,
        },
        "unit_price_rub": {
          "value": 612.5,
        },
      }
    `);
  });

  it('captures lighting details from lighting.pdf', () => {
    const lightingRowIds = new Set([
      'lighting-street-maintenance',
      'lighting-electricity',
      'lighting-poles-repair',
      'lighting-power-system-repair'
    ]);
    const workItems = lightingWorkItems
      .filter((item) => lightingRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = lightingResources
      .filter((resource) => lightingRowIds.has(resource.estimate_row_id))
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
          lightingRowIds.has(controlTotal.estimate_row_id)
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
            "aggregate_total_rub": 2549913.41,
            "cost_bucket": "primary_salary",
            "id": "lighting-street-primary-salary",
            "source_total_rub": 2549913.41,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 97820,
            "cost_bucket": "materials",
            "id": "lighting-street-materials",
            "source_total_rub": 97820,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 770073.85,
            "cost_bucket": "insurance",
            "id": "lighting-street-insurance",
            "source_total_rub": 770073.85,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1784939.39,
            "cost_bucket": "overhead",
            "id": "lighting-street-overhead",
            "source_total_rub": 1784939.39,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1019965.36,
            "cost_bucket": "profit",
            "id": "lighting-street-profit",
            "source_total_rub": 1019965.36,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 130601.32,
            "cost_bucket": "usn",
            "id": "lighting-street-usn",
            "source_total_rub": 130601.32,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 317665.67,
            "cost_bucket": "vat",
            "id": "lighting-street-vat",
            "source_total_rub": 317665.67,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 6670979,
            "cost_bucket": "gross",
            "id": "lighting-street-gross",
            "source_total_rub": 6670979,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 1374097.6,
            "cost_bucket": "materials",
            "id": "lighting-electricity-materials",
            "source_total_rub": 1374097.6,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 28839.54,
            "cost_bucket": "usn",
            "id": "lighting-electricity-usn",
            "source_total_rub": 28839.54,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 70146.86,
            "cost_bucket": "vat",
            "id": "lighting-electricity-vat",
            "source_total_rub": 70146.86,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 1473084,
            "cost_bucket": "gross",
            "id": "lighting-electricity-gross",
            "source_total_rub": 1473084,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 222066.98,
            "cost_bucket": "primary_salary",
            "id": "lighting-poles-primary-salary",
            "source_total_rub": 222066.98,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 277692.8,
            "cost_bucket": "materials",
            "id": "lighting-poles-materials",
            "source_total_rub": 277692.8,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 67064.23,
            "cost_bucket": "insurance",
            "id": "lighting-poles-insurance",
            "source_total_rub": 67064.23,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 155446.88,
            "cost_bucket": "overhead",
            "id": "lighting-poles-overhead",
            "source_total_rub": 155446.88,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 88826.79,
            "cost_bucket": "profit",
            "id": "lighting-poles-profit",
            "source_total_rub": 88826.79,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 17023.27,
            "cost_bucket": "usn",
            "id": "lighting-poles-usn",
            "source_total_rub": 17023.27,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 41406.05,
            "cost_bucket": "vat",
            "id": "lighting-poles-vat",
            "source_total_rub": 41406.05,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 869527,
            "cost_bucket": "gross",
            "id": "lighting-poles-gross",
            "source_total_rub": 869527,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 1058236.64,
            "cost_bucket": "primary_salary",
            "id": "lighting-power-system-primary-salary",
            "source_total_rub": 1058236.64,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 319587.46,
            "cost_bucket": "insurance",
            "id": "lighting-power-system-insurance",
            "source_total_rub": 319587.46,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 740765.64,
            "cost_bucket": "overhead",
            "id": "lighting-power-system-overhead",
            "source_total_rub": 740765.64,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 423294.65,
            "cost_bucket": "profit",
            "id": "lighting-power-system-profit",
            "source_total_rub": 423294.65,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 53348.94,
            "cost_bucket": "usn",
            "id": "lighting-power-system-usn",
            "source_total_rub": 53348.94,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 129761.67,
            "cost_bucket": "vat",
            "id": "lighting-power-system-vat",
            "source_total_rub": 129761.67,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 2724995,
            "cost_bucket": "gross",
            "id": "lighting-power-system-gross",
            "source_total_rub": 2724995,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "primary_salary",
            "id": "lighting-street-fixture-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 2508335.23,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "lighting-street-cable-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 41578.18,
          },
          {
            "cost_bucket": "materials",
            "id": "lighting-street-fixture-material",
            "kind": "material",
            "status": "verified",
            "total_rub": 97820,
          },
          {
            "cost_bucket": "insurance",
            "id": "lighting-street-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 770073.85,
          },
          {
            "cost_bucket": "overhead",
            "id": "lighting-street-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1784939.39,
          },
          {
            "cost_bucket": "profit",
            "id": "lighting-street-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1019965.36,
          },
          {
            "cost_bucket": "usn",
            "id": "lighting-street-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 130601.32,
          },
          {
            "cost_bucket": "vat",
            "id": "lighting-street-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 317665.67,
          },
          {
            "cost_bucket": "materials",
            "id": "lighting-electricity-material",
            "kind": "material",
            "status": "verified",
            "total_rub": 1374097.6,
          },
          {
            "cost_bucket": "usn",
            "id": "lighting-electricity-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 28839.54,
          },
          {
            "cost_bucket": "vat",
            "id": "lighting-electricity-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 70146.86,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "lighting-poles-paint-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 222066.98,
          },
          {
            "cost_bucket": "materials",
            "id": "lighting-poles-paint-material",
            "kind": "material",
            "status": "verified",
            "total_rub": 277692.8,
          },
          {
            "cost_bucket": "insurance",
            "id": "lighting-poles-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 67064.23,
          },
          {
            "cost_bucket": "overhead",
            "id": "lighting-poles-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 155446.88,
          },
          {
            "cost_bucket": "profit",
            "id": "lighting-poles-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 88826.79,
          },
          {
            "cost_bucket": "usn",
            "id": "lighting-poles-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 17023.27,
          },
          {
            "cost_bucket": "vat",
            "id": "lighting-poles-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 41406.05,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "lighting-power-system-ktp-krn-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 974022.95,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "lighting-power-system-transformer-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 84213.69,
          },
          {
            "cost_bucket": "insurance",
            "id": "lighting-power-system-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 319587.46,
          },
          {
            "cost_bucket": "overhead",
            "id": "lighting-power-system-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 740765.64,
          },
          {
            "cost_bucket": "profit",
            "id": "lighting-power-system-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 423294.65,
          },
          {
            "cost_bucket": "usn",
            "id": "lighting-power-system-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 53348.94,
          },
          {
            "cost_bucket": "vat",
            "id": "lighting-power-system-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 129761.67,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "lighting-street-maintenance",
            "id": "lighting-street-maintenance",
            "service_ids": [
              "year-round-power-lines-maintenance",
            ],
            "status": "verified",
          },
          {
            "estimate_row_id": "lighting-electricity",
            "id": "lighting-electricity",
            "service_ids": [],
            "status": "verified",
          },
          {
            "estimate_row_id": "lighting-poles-repair",
            "id": "lighting-poles-repair",
            "service_ids": [],
            "status": "verified",
          },
          {
            "estimate_row_id": "lighting-power-system-repair",
            "id": "lighting-power-system-repair",
            "service_ids": [
              "year-round-power-lines-maintenance",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });
});
