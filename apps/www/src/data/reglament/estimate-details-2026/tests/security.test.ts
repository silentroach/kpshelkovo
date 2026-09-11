import { describe, expect, it } from 'vitest';

import {
  securityControlTotals,
  securityResources,
  securityWorkItems
} from '@/data/reglament/estimate-details-2026/security';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';

const sectionControlTotals = resolveSectionControlTotals(securityControlTotals, securityResources);

describe('estimate details 2026 security', () => {
  it('keeps security quote items enriched with source table fields', () => {
    const skudSource = securityResources
      .find((resource) => resource.id === 'security-equipment-skud-labor')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'security' &&
          ref.page === 9 &&
          ref.fragment === 'позиция 3.1 / обслуживание системы СКУД TRASSIR'
      );
    const skudItem = skudSource?.quote_items?.find(
      (item) => item.label === 'Труд по обслуживанию системы СКУД TRASSIR'
    );

    expect(skudItem).toMatchInlineSnapshot(`
      {
        "label": "Труд по обслуживанию системы СКУД TRASSIR",
        "quantity": {
          "unit": "чел-час",
          "value": 35.1,
        },
        "resource_ids": [
          "security-equipment-skud-labor",
        ],
        "total_rub": {
          "value": 26252.91,
        },
        "unit_price_rub": {
          "value": 749.01,
        },
      }
    `);
  });

  it('captures security details from security.pdf', () => {
    const securityRowIds = new Set([
      'security-access-control',
      'security-equipment-maintenance',
      'security-dispatch'
    ]);
    const workItems = securityWorkItems
      .filter((item) => securityRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = securityResources
      .filter((resource) => securityRowIds.has(resource.estimate_row_id))
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
          securityRowIds.has(controlTotal.estimate_row_id)
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
            "aggregate_total_rub": 8640000,
            "cost_bucket": "contractors",
            "id": "security-access-control-contractors",
            "source_total_rub": 8640000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 1008000,
            "cost_bucket": "materials",
            "id": "security-access-control-materials",
            "source_total_rub": 1008000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 65672.38,
            "cost_bucket": "usn",
            "id": "security-access-control-usn",
            "source_total_rub": 65672.38,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 485683.62,
            "cost_bucket": "vat",
            "id": "security-access-control-vat",
            "source_total_rub": 485683.62,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 10199356,
            "cost_bucket": "gross",
            "id": "security-access-control-gross",
            "source_total_rub": 10199356,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 503202.05,
            "cost_bucket": "primary_salary",
            "id": "security-equipment-primary-salary",
            "source_total_rub": 503202.05,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 10000,
            "cost_bucket": "materials",
            "id": "security-equipment-materials",
            "source_total_rub": 10000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 494584.56,
            "cost_bucket": "contractors",
            "id": "security-equipment-contractors",
            "source_total_rub": 494584.56,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 151967.02,
            "cost_bucket": "insurance",
            "id": "security-equipment-insurance",
            "source_total_rub": 151967.02,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 352241.43,
            "cost_bucket": "overhead",
            "id": "security-equipment-overhead",
            "source_total_rub": 352241.43,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 201280.82,
            "cost_bucket": "profit",
            "id": "security-equipment-profit",
            "source_total_rub": 201280.82,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 11662.22,
            "cost_bucket": "usn",
            "id": "security-equipment-usn",
            "source_total_rub": 11662.22,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 86246.9,
            "cost_bucket": "vat",
            "id": "security-equipment-vat",
            "source_total_rub": 86246.9,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 1811185,
            "cost_bucket": "gross",
            "id": "security-equipment-gross",
            "source_total_rub": 1811185,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 1080000,
            "cost_bucket": "primary_salary",
            "id": "security-dispatch-primary-salary",
            "source_total_rub": 1080000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 326160,
            "cost_bucket": "insurance",
            "id": "security-dispatch-insurance",
            "source_total_rub": 326160,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 756000,
            "cost_bucket": "overhead",
            "id": "security-dispatch-overhead",
            "source_total_rub": 756000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 432000,
            "cost_bucket": "profit",
            "id": "security-dispatch-profit",
            "source_total_rub": 432000,
            "status": "verified",
          },
          {
            "aggregate_total_rub": 17658.1,
            "cost_bucket": "usn",
            "id": "security-dispatch-usn",
            "source_total_rub": 17658.1,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 130590.9,
            "cost_bucket": "vat",
            "id": "security-dispatch-vat",
            "source_total_rub": 130590.9,
            "status": "needs_check",
          },
          {
            "aggregate_total_rub": 2742409,
            "cost_bucket": "gross",
            "id": "security-dispatch-gross",
            "source_total_rub": 2742409,
            "status": "needs_check",
          },
        ],
        "resources": [
          {
            "cost_bucket": "contractors",
            "id": "security-access-control-chop-service",
            "kind": "contractor",
            "status": "verified",
            "total_rub": 8640000,
          },
          {
            "cost_bucket": "materials",
            "id": "security-access-control-kpp-materials",
            "kind": "material",
            "status": "verified",
            "total_rub": 1008000,
          },
          {
            "cost_bucket": "usn",
            "id": "security-access-control-usn",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 65672.38,
          },
          {
            "cost_bucket": "vat",
            "id": "security-access-control-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 485683.62,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "security-equipment-video-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 437513.59,
          },
          {
            "cost_bucket": "materials",
            "id": "security-equipment-video-cameras",
            "kind": "material",
            "status": "verified",
            "total_rub": 10000,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "security-equipment-monitor-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 28919.4,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "security-equipment-server-power-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 10516.15,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "security-equipment-skud-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 26252.91,
          },
          {
            "cost_bucket": "contractors",
            "id": "security-equipment-barrier-contractor",
            "kind": "contractor",
            "status": "verified",
            "total_rub": 360000,
          },
          {
            "cost_bucket": "contractors",
            "id": "security-equipment-domilend-contractor",
            "kind": "contractor",
            "status": "verified",
            "total_rub": 134584.56,
          },
          {
            "cost_bucket": "insurance",
            "id": "security-equipment-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 151967.02,
          },
          {
            "cost_bucket": "overhead",
            "id": "security-equipment-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 352241.43,
          },
          {
            "cost_bucket": "profit",
            "id": "security-equipment-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 201280.82,
          },
          {
            "cost_bucket": "usn",
            "id": "security-equipment-usn",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 11662.22,
          },
          {
            "cost_bucket": "vat",
            "id": "security-equipment-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 86246.9,
          },
          {
            "cost_bucket": "primary_salary",
            "id": "security-dispatch-labor",
            "kind": "labor",
            "status": "verified",
            "total_rub": 1080000,
          },
          {
            "cost_bucket": "insurance",
            "id": "security-dispatch-insurance",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 326160,
          },
          {
            "cost_bucket": "overhead",
            "id": "security-dispatch-overhead",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 756000,
          },
          {
            "cost_bucket": "profit",
            "id": "security-dispatch-profit",
            "kind": "other_cost",
            "status": "verified",
            "total_rub": 432000,
          },
          {
            "cost_bucket": "usn",
            "id": "security-dispatch-usn",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 17658.1,
          },
          {
            "cost_bucket": "vat",
            "id": "security-dispatch-vat-derived",
            "kind": "other_cost",
            "status": "needs_check",
            "total_rub": 130590.9,
          },
        ],
        "workItems": [
          {
            "estimate_row_id": "security-access-control",
            "id": "security-access-control",
            "service_ids": [
              "year-round-access-control",
            ],
            "status": "verified",
          },
          {
            "estimate_row_id": "security-equipment-maintenance",
            "id": "security-equipment-maintenance",
            "service_ids": [],
            "status": "verified",
          },
          {
            "estimate_row_id": "security-dispatch",
            "id": "security-dispatch",
            "service_ids": [],
            "status": "verified",
          },
        ],
      }
    `);
  });
});
