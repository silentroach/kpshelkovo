import { describe, expect, it } from 'vitest';

import {
  landscapingControlTotals,
  landscapingResources,
  landscapingWorkItems
} from '@/data/reglament/estimate-details-2026/landscaping';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';

const sectionControlTotals = resolveSectionControlTotals(
  landscapingControlTotals,
  landscapingResources
);
const resourcesById = new Map(landscapingResources.map((resource) => [resource.id, resource]));

describe('estimate details 2026 landscaping', () => {
  it('keeps landscaping quote items enriched with source table fields', () => {
    const treePpeSource = resourcesById
      .get('landscaping-trees-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'landscaping' &&
          ref.page === 15 &&
          ref.fragment === 'позиция 9.1 / средства охраны труда для ухода за деревьями, начало'
      );
    const resourceStatementSource = resourcesById
      .get('landscaping-mowing-trimmer-machine')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'landscaping' &&
          ref.page === 21 &&
          ref.fragment === 'ресурсная ведомость по локальному ресурсному сметному расчету'
      );
    const trimmerResourceStatementItem = resourceStatementSource?.quote_items?.find(
      (item) => item.label === 'Триммер бензиновый'
    );

    expect({
      ppe: treePpeSource?.quote_items?.[0],
      resourceStatement: trimmerResourceStatementItem
    }).toMatchInlineSnapshot(`
      {
        "ppe": {
          "label": "Костюм хлопчатобумажный",
          "quantity": {
            "note": "количество в PDF округлено; итог сохранен по исходной строке",
            "unit": "шт.",
            "value": 0.5,
          },
          "resource_ids": [
            "landscaping-trees-ppe-cotton-suit",
          ],
          "total_rub": {
            "value": 2915,
          },
          "unit_price_rub": {
            "value": 5500,
          },
        },
        "resourceStatement": {
          "label": "Триммер бензиновый",
          "quantity": {
            "unit": "маш.-час",
            "value": 1030.4,
          },
          "resource_ids": [
            "landscaping-mowing-trimmer-machine",
          ],
          "total_rub": {
            "value": 61792.83,
          },
          "unit_price_rub": {
            "value": 59.97,
          },
        },
      }
    `);
  });

  it('captures landscaping details from landscaping.pdf', () => {
    const landscapingRowIds = new Set([
      'landscaping-mowing-ditches',
      'landscaping-trees-shrubs',
      'landscaping-ticks-hogweed',
      'landscaping-forest-care'
    ]);
    const workItems = landscapingWorkItems.filter((item) =>
      landscapingRowIds.has(item.estimate_row_id)
    );
    const resources = landscapingResources.filter((resource) =>
      landscapingRowIds.has(resource.estimate_row_id)
    );
    const grossControlTotals = sectionControlTotals
      .filter(
        (controlTotal) =>
          landscapingRowIds.has(controlTotal.estimate_row_id) &&
          controlTotal.control_source === 'section_pdf' &&
          controlTotal.cost_bucket === 'gross'
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status
      }));
    const resourceKinds = new Set(resources.map((resource) => resource.kind));

    expect(workItems).toHaveLength(4);
    expect(resources).toHaveLength(57);
    expect(grossControlTotals).toHaveLength(4);
    expect(resourceKinds).toEqual(
      new Set(['labor', 'machinist_labor', 'machine', 'material', 'contractor', 'other_cost'])
    );
    expect(grossControlTotals).toMatchInlineSnapshot(`
      [
        {
          "aggregate_total_rub": 1816356,
          "id": "landscaping-mowing-gross",
          "status": "derived",
        },
        {
          "aggregate_total_rub": 1755909,
          "id": "landscaping-trees-gross",
          "status": "derived",
        },
        {
          "aggregate_total_rub": 6207773,
          "id": "landscaping-ticks-hogweed-gross",
          "status": "derived",
        },
        {
          "aggregate_total_rub": 438041,
          "id": "landscaping-forest-gross",
          "status": "derived",
        },
      ]
    `);
  });
});
