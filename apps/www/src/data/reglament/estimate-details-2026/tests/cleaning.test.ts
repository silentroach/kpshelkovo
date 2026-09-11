import { describe, expect, it } from 'vitest';

import {
  cleaningControlTotals,
  cleaningResources,
  cleaningWorkItems
} from '@/data/reglament/estimate-details-2026/cleaning';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';

const sectionControlTotals = resolveSectionControlTotals(cleaningControlTotals, cleaningResources);

describe('estimate details 2026 cleaning', () => {
  it('keeps cleaning quote items enriched with source table fields', () => {
    const winterMechanizedPpeSource = cleaningResources
      .find((resource) => resource.id === 'cleaning-winter-mechanized-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'cleaning' &&
          ref.page === 12 &&
          ref.fragment === 'позиция 1.4 / средства охраны труда для зимней механизированной уборки'
      );
    const resourceStatementMaterialsSource = sectionControlTotals
      .find((controlTotal) => controlTotal.id === 'cleaning-resource-statement-materials')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'cleaning' &&
          ref.page === 26 &&
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету / материалы'
      );

    expect({
      ppe: winterMechanizedPpeSource?.quote_items?.[0],
      resourceStatement: resourceStatementMaterialsSource?.quote_items?.[0]
    }).toMatchInlineSnapshot(`
      {
        "ppe": {
          "label": "Костюм хлопчатобумажный",
          "quantity": {
            "unit": "шт.",
            "value": 2.7,
          },
          "resource_ids": [
            "cleaning-winter-mechanized-ppe-cotton-suit",
          ],
          "total_rub": {
            "value": 14850,
          },
          "unit_price_rub": {
            "value": 5500,
          },
        },
        "resourceStatement": {
          "label": "Костюм",
          "quantity": {
            "unit": "шт.",
            "value": 27.5,
          },
          "total_rub": {
            "value": 151250,
          },
          "unit_price_rub": {
            "value": 5500,
          },
        },
      }
    `);
  });

  it('captures winter mechanized cleaning details from cleaning.pdf', () => {
    const workItems = cleaningWorkItems
      .filter((item) => item.estimate_row_id === 'cleaning-winter-mechanized')
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = cleaningResources
      .filter((resource) => resource.estimate_row_id === 'cleaning-winter-mechanized')
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
          controlTotal.estimate_row_id === 'cleaning-winter-mechanized'
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
            "aggregate_total_rub": 4998769.96,
            "cost_bucket": "machinist_salary",
            "id": "cleaning-winter-mechanized-machinist-salary",
            "source_total_rub": 4998769.96,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 7905533.7,
            "cost_bucket": "machines",
            "id": "cleaning-winter-mechanized-machines",
            "source_total_rub": 7905533.7,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 181328.76,
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-materials",
            "source_total_rub": 181328.76,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1509628.52,
            "cost_bucket": "insurance",
            "id": "cleaning-winter-mechanized-insurance",
            "source_total_rub": 1509628.52,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 3499138.97,
            "cost_bucket": "overhead",
            "id": "cleaning-winter-mechanized-overhead",
            "source_total_rub": 3499138.97,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1999507.98,
            "cost_bucket": "profit",
            "id": "cleaning-winter-mechanized-profit",
            "source_total_rub": 1999507.98,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 352872.11,
            "cost_bucket": "usn",
            "id": "cleaning-winter-mechanized-usn",
            "source_total_rub": 352872.12,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 1022339,
            "cost_bucket": "vat",
            "id": "cleaning-winter-mechanized-vat",
            "source_total_rub": 1022339,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 21469119,
            "cost_bucket": "gross",
            "id": "cleaning-winter-mechanized-gross",
            "source_total_rub": 21469119,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "machinist_salary",
            "id": "cleaning-winter-mechanized-snow-2cm-machinist-labor",
            "kind": "machinist_labor",
            "status": "verified",
            "total_rub": 2018293.38,
          },
          {
            "cost_bucket": "machinist_salary",
            "id": "cleaning-winter-mechanized-heavy-snow-machinist-labor",
            "kind": "machinist_labor",
            "status": "verified",
            "total_rub": 2783931.69,
          },
          {
            "cost_bucket": "machinist_salary",
            "id": "cleaning-winter-mechanized-sand-machinist-labor",
            "kind": "machinist_labor",
            "status": "verified",
            "total_rub": 196544.88,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-winter-mechanized-snow-2cm-tractor-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 3188460.49,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-winter-mechanized-heavy-snow-tractor-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 4398000.94,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-winter-mechanized-sand-tractor-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 310497.76,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-winter-mechanized-sand-spreader-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 8574.51,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-sand",
            "kind": "material",
            "status": "verified",
            "total_rub": 132480.36,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-cotton-suit",
            "kind": "material",
            "status": "verified",
            "total_rub": 14850,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-insulated-jacket",
            "kind": "material",
            "status": "verified",
            "total_rub": 6480,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-signal-vest",
            "kind": "material",
            "status": "verified",
            "total_rub": 3240,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-insulated-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 3780,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-polymer-gloves",
            "kind": "material",
            "status": "verified",
            "total_rub": 3780,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-insulated-mittens",
            "kind": "material",
            "status": "verified",
            "total_rub": 7560,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-rubber-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 5400,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-mechanized-ppe-soap",
            "kind": "material",
            "status": "verified",
            "total_rub": 3758.4,
          },
          {
            "cost_bucket": "insurance",
            "id": "cleaning-winter-mechanized-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1509628.52,
          },
          {
            "cost_bucket": "overhead",
            "id": "cleaning-winter-mechanized-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 3499138.97,
          },
          {
            "cost_bucket": "profit",
            "id": "cleaning-winter-mechanized-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 1999507.98,
          },
          {
            "cost_bucket": "usn",
            "id": "cleaning-winter-mechanized-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 352872.12,
          },
          {
            "cost_bucket": "vat",
            "id": "cleaning-winter-mechanized-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 1022339,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "cleaning-winter-mechanized",
            "id": "cleaning-winter-mechanized",
            "service_ids": [
              "winter-road-snow-ice-clearing",
              "winter-heavy-snowfall-road-clearing",
              "winter-anti-ice-spreading",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });

  it('captures summer mechanized cleaning details from cleaning.pdf', () => {
    const workItems = cleaningWorkItems
      .filter((item) => item.estimate_row_id === 'cleaning-summer-mechanized')
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = cleaningResources
      .filter((resource) => resource.estimate_row_id === 'cleaning-summer-mechanized')
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
          controlTotal.estimate_row_id === 'cleaning-summer-mechanized'
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
            "aggregate_total_rub": 20918659.44,
            "cost_bucket": "machinist_salary",
            "id": "cleaning-summer-mechanized-machinist-salary",
            "source_total_rub": 20918659.44,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 35473842.02,
            "cost_bucket": "machines",
            "id": "cleaning-summer-mechanized-machines",
            "source_total_rub": 35473842.02,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 335990.88,
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-materials",
            "source_total_rub": 335990.88,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 6317435.15,
            "cost_bucket": "insurance",
            "id": "cleaning-summer-mechanized-insurance",
            "source_total_rub": 6317435.15,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 14643061.61,
            "cost_bucket": "overhead",
            "id": "cleaning-summer-mechanized-overhead",
            "source_total_rub": 14643061.61,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 8367463.78,
            "cost_bucket": "profit",
            "id": "cleaning-summer-mechanized-profit",
            "source_total_rub": 8367463.78,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1511249.98,
            "cost_bucket": "usn",
            "id": "cleaning-summer-mechanized-usn",
            "source_total_rub": 1511249.98,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 4378385.14,
            "cost_bucket": "vat",
            "id": "cleaning-summer-mechanized-vat",
            "source_total_rub": 4378385.14,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 91946088,
            "cost_bucket": "gross",
            "id": "cleaning-summer-mechanized-gross",
            "source_total_rub": 91946088,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "machinist_salary",
            "id": "cleaning-summer-mechanized-watering-machinist-labor",
            "kind": "machinist_labor",
            "status": "verified",
            "total_rub": 20918659.44,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-summer-mechanized-watering-tractor-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 33046889.8,
          },
          {
            "cost_bucket": "machines",
            "id": "cleaning-summer-mechanized-watering-opm5-machine",
            "kind": "machine",
            "status": "verified",
            "total_rub": 2426952.22,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-water",
            "kind": "material",
            "status": "verified",
            "total_rub": 129742.08,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-cotton-suit",
            "kind": "material",
            "status": "verified",
            "total_rub": 62700,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-insulated-jacket",
            "kind": "material",
            "status": "verified",
            "total_rub": 27360,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-signal-vest",
            "kind": "material",
            "status": "verified",
            "total_rub": 13680,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-insulated-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 15960,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-polymer-gloves",
            "kind": "material",
            "status": "verified",
            "total_rub": 15960,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-insulated-mittens",
            "kind": "material",
            "status": "verified",
            "total_rub": 31920,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-rubber-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 22800,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-mechanized-ppe-soap",
            "kind": "material",
            "status": "verified",
            "total_rub": 15868.8,
          },
          {
            "cost_bucket": "insurance",
            "id": "cleaning-summer-mechanized-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 6317435.15,
          },
          {
            "cost_bucket": "overhead",
            "id": "cleaning-summer-mechanized-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 14643061.61,
          },
          {
            "cost_bucket": "profit",
            "id": "cleaning-summer-mechanized-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 8367463.78,
          },
          {
            "cost_bucket": "usn",
            "id": "cleaning-summer-mechanized-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 1511249.98,
          },
          {
            "cost_bucket": "vat",
            "id": "cleaning-summer-mechanized-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 4378385.14,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "cleaning-summer-mechanized",
            "id": "cleaning-summer-mechanized",
            "service_ids": [
              "summer-road-dust-suppression",
              "summer-road-watering",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });

  it('captures summer manual cleaning details from cleaning.pdf', () => {
    const workItems = cleaningWorkItems
      .filter((item) => item.estimate_row_id === 'cleaning-summer-manual')
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = cleaningResources
      .filter((resource) => resource.estimate_row_id === 'cleaning-summer-manual')
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
          controlTotal.estimate_row_id === 'cleaning-summer-manual'
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status
      }));
    const ditchCleaningResource = cleaningResources.find(
      (resource) => resource.id === 'cleaning-summer-manual-ditch-cleaning-worker-labor'
    );

    expect(ditchCleaningResource).toMatchObject({
      quantity: { value: 24_337.7, unit: 'чел-час' }
    });
    expect(
      ditchCleaningResource?.source_refs.map((sourceRef) => sourceRef.quote ?? '').join('\n')
    ).toContain('15 раз в летний период');
    expect({ workItems, resources, controlTotals }).toMatchInlineSnapshot(`
      {
        "controlTotals": [
          {
            "aggregate_total_rub": 16429653.29,
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-primary-salary",
            "source_total_rub": 16429653.29,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 274250,
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-materials",
            "source_total_rub": 274250,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 4961755.3,
            "cost_bucket": "insurance",
            "id": "cleaning-summer-manual-insurance",
            "source_total_rub": 4961755.3,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 11500757.3,
            "cost_bucket": "overhead",
            "id": "cleaning-summer-manual-overhead",
            "source_total_rub": 11500757.3,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 6571861.32,
            "cost_bucket": "profit",
            "id": "cleaning-summer-manual-profit",
            "source_total_rub": 6571861.32,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 697849.46,
            "cost_bucket": "usn",
            "id": "cleaning-summer-manual-usn",
            "source_total_rub": 697849.46,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 2021806.33,
            "cost_bucket": "vat",
            "id": "cleaning-summer-manual-vat",
            "source_total_rub": 2021806.33,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 42457933,
            "cost_bucket": "gross",
            "id": "cleaning-summer-manual-gross",
            "source_total_rub": 42457933,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-curb-cleaning-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 109540.22,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-parking-trash-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 58551.86,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-parking-sweeping-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 8747.24,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-container-site-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 89014.13,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-summer-manual-ditch-cleaning-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 16163799.83,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-cotton-suit",
            "kind": "material",
            "status": "verified",
            "total_rub": 68750,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-insulated-jacket",
            "kind": "material",
            "status": "verified",
            "total_rub": 30000,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-signal-vest",
            "kind": "material",
            "status": "verified",
            "total_rub": 15000,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-insulated-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 17500,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-polymer-gloves",
            "kind": "material",
            "status": "verified",
            "total_rub": 17500,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-insulated-mittens",
            "kind": "material",
            "status": "verified",
            "total_rub": 35000,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-rubber-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 25000,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-ppe-soap",
            "kind": "material",
            "status": "verified",
            "total_rub": 17400,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-inventory-polypropylene-broom",
            "kind": "material",
            "status": "verified",
            "total_rub": 23125,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-inventory-rake",
            "kind": "material",
            "status": "verified",
            "total_rub": 2062.5,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-inventory-scoop-shovel",
            "kind": "material",
            "status": "verified",
            "total_rub": 6462.5,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-inventory-wheelbarrow",
            "kind": "material",
            "status": "verified",
            "total_rub": 15625,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-summer-manual-inventory-bucket-12l",
            "kind": "material",
            "status": "verified",
            "total_rub": 825,
          },
          {
            "cost_bucket": "insurance",
            "id": "cleaning-summer-manual-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 4961755.3,
          },
          {
            "cost_bucket": "overhead",
            "id": "cleaning-summer-manual-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 11500757.3,
          },
          {
            "cost_bucket": "profit",
            "id": "cleaning-summer-manual-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 6571861.32,
          },
          {
            "cost_bucket": "usn",
            "id": "cleaning-summer-manual-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 697849.46,
          },
          {
            "cost_bucket": "vat",
            "id": "cleaning-summer-manual-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 2021806.33,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "cleaning-summer-manual",
            "id": "cleaning-summer-manual",
            "service_ids": [
              "summer-road-manual-cleaning",
              "summer-road-gutters-cleaning",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });

  it('captures winter manual cleaning details from cleaning.pdf', () => {
    const workItems = cleaningWorkItems
      .filter((item) => item.estimate_row_id === 'cleaning-winter-manual')
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = cleaningResources
      .filter((resource) => resource.estimate_row_id === 'cleaning-winter-manual')
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
          controlTotal.estimate_row_id === 'cleaning-winter-manual'
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
            "aggregate_total_rub": 1212248.55,
            "cost_bucket": "primary_salary",
            "id": "cleaning-winter-manual-primary-salary",
            "source_total_rub": 1212248.55,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 25846.2,
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-materials",
            "source_total_rub": 25846.2,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 366099.05,
            "cost_bucket": "insurance",
            "id": "cleaning-winter-manual-insurance",
            "source_total_rub": 366099.05,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 848573.98,
            "cost_bucket": "overhead",
            "id": "cleaning-winter-manual-overhead",
            "source_total_rub": 848573.98,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 484899.42,
            "cost_bucket": "profit",
            "id": "cleaning-winter-manual-profit",
            "source_total_rub": 484899.42,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 51588.99,
            "cost_bucket": "usn",
            "id": "cleaning-winter-manual-usn",
            "source_total_rub": 51588.99,
            "status": "derived",
          },
          {
            "aggregate_total_rub": 149462.81,
            "cost_bucket": "vat",
            "id": "cleaning-winter-manual-vat",
            "source_total_rub": 149462.81,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 3138719,
            "cost_bucket": "gross",
            "id": "cleaning-winter-manual-gross",
            "source_total_rub": 3138719,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-winter-manual-snow-sweeping-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 48706.24,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-winter-manual-anti-ice-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 19383.1,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-winter-manual-road-snow-ice-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 840033.57,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "cleaning-winter-manual-container-site-worker-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 304125.64,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-sand",
            "kind": "material",
            "status": "verified",
            "total_rub": 4849.2,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-cotton-suit",
            "kind": "material",
            "status": "verified",
            "total_rub": 4950,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-insulated-jacket",
            "kind": "material",
            "status": "verified",
            "total_rub": 2160,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-signal-vest",
            "kind": "material",
            "status": "verified",
            "total_rub": 1080,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-insulated-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 1260,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-polymer-gloves",
            "kind": "material",
            "status": "verified",
            "total_rub": 1260,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-insulated-mittens",
            "kind": "material",
            "status": "verified",
            "total_rub": 2520,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-rubber-boots",
            "kind": "material",
            "status": "verified",
            "total_rub": 1800,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-ppe-soap",
            "kind": "material",
            "status": "verified",
            "total_rub": 1252.8,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-ice-axe",
            "kind": "material",
            "status": "verified",
            "total_rub": 126,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-polypropylene-broom",
            "kind": "material",
            "status": "verified",
            "total_rub": 1665,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-rake",
            "kind": "material",
            "status": "verified",
            "total_rub": 148.5,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-snow-shovel",
            "kind": "material",
            "status": "verified",
            "total_rub": 1125,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-scoop-shovel",
            "kind": "material",
            "status": "verified",
            "total_rub": 465.3,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-wheelbarrow",
            "kind": "material",
            "status": "verified",
            "total_rub": 1125,
          },
          {
            "cost_bucket": "materials",
            "id": "cleaning-winter-manual-inventory-bucket-12l",
            "kind": "material",
            "status": "verified",
            "total_rub": 59.4,
          },
          {
            "cost_bucket": "insurance",
            "id": "cleaning-winter-manual-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 366099.05,
          },
          {
            "cost_bucket": "overhead",
            "id": "cleaning-winter-manual-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 848573.98,
          },
          {
            "cost_bucket": "profit",
            "id": "cleaning-winter-manual-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 484899.42,
          },
          {
            "cost_bucket": "usn",
            "id": "cleaning-winter-manual-usn-derived",
            "kind": "other_cost",
            "status": "derived",
            "total_rub": 51588.99,
          },
          {
            "cost_bucket": "vat",
            "id": "cleaning-winter-manual-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 149462.81,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "cleaning-winter-manual",
            "id": "cleaning-winter-manual",
            "service_ids": [
              "winter-paths-playgrounds-clearing",
              "winter-anti-ice-spreading",
            ],
            "status": "verified",
          },
        ],
      }
    `);
  });

  it('reconciles cleaning resources against the resource statement', () => {
    const controlTotals = sectionControlTotals
      .filter((controlTotal) => controlTotal.id.startsWith('cleaning-resource-statement-'))
      .map((controlTotal) => ({
        id: controlTotal.id,
        estimate_row_id: controlTotal.estimate_row_id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        detail_total_rub: controlTotal.detail_total_rub?.value ?? null,
        status: controlTotal.status
      }));

    expect(controlTotals).toMatchInlineSnapshot(`
      [
        {
          "cost_bucket": "primary_salary",
          "detail_total_rub": 17641901.83,
          "estimate_row_id": "cleaning",
          "id": "cleaning-resource-statement-primary-salary",
          "source_total_rub": 17641901.84,
          "status": "verified",
        },
        {
          "cost_bucket": "machinist_salary",
          "detail_total_rub": 25917429.39,
          "estimate_row_id": "cleaning",
          "id": "cleaning-resource-statement-machinist-salary",
          "source_total_rub": 25917429.4,
          "status": "verified",
        },
        {
          "cost_bucket": "machines",
          "detail_total_rub": 43379375.72,
          "estimate_row_id": "cleaning",
          "id": "cleaning-resource-statement-machines",
          "source_total_rub": 43379375.72,
          "status": "verified",
        },
        {
          "cost_bucket": "materials",
          "detail_total_rub": 817415.84,
          "estimate_row_id": "cleaning",
          "id": "cleaning-resource-statement-materials",
          "source_total_rub": 817415.84,
          "status": "needs_check",
        },
      ]
    `);
  });
});
