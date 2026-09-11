import { describe, expect, it } from 'vitest';

import {
  improvementControlTotals,
  improvementResources,
  improvementWorkItems
} from '@/data/reglament/estimate-details-2026/improvement';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';

const sectionControlTotals = resolveSectionControlTotals(
  improvementControlTotals,
  improvementResources
);
const resourcesById = new Map(improvementResources.map((resource) => [resource.id, resource]));

describe('estimate details 2026 improvement', () => {
  it('keeps improvement quote items enriched with source table fields', () => {
    const ppeSource = resourcesById
      .get('improvement-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'improvement' &&
          ref.page === 14 &&
          ref.fragment === 'позиция 8.1 / средства охраны труда'
      );
    const toolsSource = resourcesById
      .get('improvement-scoop-shovel')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'improvement' &&
          ref.page === 14 &&
          ref.fragment === 'позиция 9.1 / износ оборудования и инструментов'
      );
    const scoopShovelItem = toolsSource?.quote_items?.find(
      (item) => item.label === 'Лопата совковая'
    );

    expect({
      ppe: ppeSource?.quote_items?.[0],
      tool: scoopShovelItem
    }).toMatchInlineSnapshot(`
      {
        "ppe": {
          "label": "Костюм хлопчатобумажный",
          "quantity": {
            "unit": "шт.",
            "value": 1.3,
          },
          "resource_ids": [
            "improvement-ppe-cotton-suit",
          ],
          "total_rub": {
            "value": 7150,
          },
          "unit_price_rub": {
            "value": 5500,
          },
        },
        "tool": {
          "label": "Лопата совковая",
          "quantity": {
            "unit": "шт.",
            "value": 0.7,
          },
          "resource_ids": [
            "improvement-scoop-shovel",
          ],
          "total_rub": {
            "value": 672.1,
          },
          "unit_price_rub": {
            "value": 1034,
          },
        },
      }
    `);
  });

  it('captures improvement details and the road/fence mismatch', () => {
    const improvementRowIds = new Set([
      'improvement-objects-maintenance',
      'improvement-road-surface-repair'
    ]);
    const workItems = improvementWorkItems
      .filter((item) => improvementRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status
      }));
    const resources = improvementResources.filter((resource) =>
      improvementRowIds.has(resource.estimate_row_id)
    );
    const grossControlTotals = sectionControlTotals
      .filter(
        (controlTotal) =>
          improvementRowIds.has(controlTotal.estimate_row_id) &&
          controlTotal.control_source === 'section_pdf' &&
          controlTotal.cost_bucket === 'gross'
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status
      }));
    const needsCheckIds = [
      ...improvementWorkItems,
      ...improvementResources,
      ...sectionControlTotals
    ]
      .filter(
        (item) =>
          improvementRowIds.has(item.estimate_row_id) &&
          (!('control_source' in item) || item.control_source === 'section_pdf') &&
          item.status === 'needs_check'
      )
      .map((item) => item.id);

    expect(workItems).toMatchInlineSnapshot(`
      [
        {
          "estimate_row_id": "improvement-objects-maintenance",
          "id": "improvement-objects-maintenance",
          "service_ids": [
            "year-round-common-area-repair",
            "summer-waterbody-cleaning",
            "summer-curbstone-painting",
          ],
          "status": "verified",
        },
        {
          "estimate_row_id": "improvement-road-surface-repair",
          "id": "improvement-road-surface-repair",
          "service_ids": [
            "year-round-perimeter-fence-repair",
          ],
          "status": "needs_check",
        },
      ]
    `);
    expect(resources).toHaveLength(35);
    expect(grossControlTotals).toMatchInlineSnapshot(`
      [
        {
          "aggregate_total_rub": 4366756,
          "id": "improvement-objects-gross",
          "status": "derived",
        },
        {
          "aggregate_total_rub": 320424,
          "id": "improvement-fence-repair-gross",
          "status": "needs_check",
        },
      ]
    `);
    expect(needsCheckIds).toEqual([
      'improvement-road-surface-repair',
      'improvement-fence-profile-sheet-repair',
      'improvement-fence-repair-usn-derived',
      'improvement-fence-repair-vat-derived',
      'improvement-fence-repair-materials',
      'improvement-fence-repair-usn',
      'improvement-fence-repair-vat',
      'improvement-fence-repair-gross'
    ]);
  });
});
