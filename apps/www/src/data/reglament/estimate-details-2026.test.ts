import { describe, expect, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { estimateDetails2026 } from '@/data/reglament/estimate-details-2026';
import {
  lightingControlTotals,
  lightingResources,
} from '@/data/reglament/estimate-details-2026/lighting';
import { resolveSectionControlTotals } from '@/data/reglament/estimate-details-2026/shared';
import { fullReglamentDataset2026 } from '@/data/reglament/full-2026';
import type {
  EstimateDetailControlTotal,
  EstimateDetailResource,
  EstimateDetailSourceRef,
} from '@/lib/reglament/detail-schema';
import type { EstimateRow } from '@/lib/reglament/schema';

type DetailFactWithSourceRefs = {
  readonly fact_id: string;
  readonly source_refs: readonly EstimateDetailSourceRef[];
};

type ControlTotalSumMismatch = {
  readonly control_total_id: string;
  readonly issue: string;
  readonly declared_total_rub: number | null;
  readonly resources_without_total?: readonly string[];
  readonly resource_total_rub?: number;
  readonly delta_rub?: number;
  readonly tolerance_rub?: number;
};

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const flattenRows = (rows: readonly EstimateRow[]): readonly EstimateRow[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.children ?? [])]);

const estimateRows = flattenRows(
  estimate2026.sections.flatMap((section) => section.rows),
);

const estimateItemIds = new Set([
  estimate2026.id,
  ...estimate2026.sections.map((section) => section.id),
  ...estimateRows.map((row) => row.id),
]);

const estimateRowsById = new Map(estimateRows.map((row) => [row.id, row]));

const estimateSectionsById = new Map(
  estimate2026.sections.map((section) => [section.id, section]),
);

const sourcePdfIds = new Set(
  estimateDetails2026.source_pdfs.map((sourcePdf) => sourcePdf.pdf),
);

const serviceIds = new Set(
  fullReglamentDataset2026.services.map((service) => service.id),
);

const resourcesById = new Map(
  estimateDetails2026.resources.map((resource) => [resource.id, resource]),
);

const obviousMultiPositionQuotePatterns = [
  /Костюм .*; Куртка/,
  /Ледоруб.*; Метла/,
  /Метла .*; Грабли/,
  /Рабочий.*; Машинист/,
  /Трактор .*; ОПМ/,
  /Видеокамера/,
] as const;

const hasOwnPropertyDeep = (value: unknown, key: string): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;

  return Object.values(value).some((nestedValue) =>
    hasOwnPropertyDeep(nestedValue, key),
  );
};

const detailFactsWithSourceRefs = (): readonly DetailFactWithSourceRefs[] => [
  ...estimateDetails2026.work_items.map((item) => ({
    fact_id: `work_items:${item.id}`,
    source_refs: item.source_refs,
  })),
  ...estimateDetails2026.resources.map((resource) => ({
    fact_id: `resources:${resource.id}`,
    source_refs: resource.source_refs,
  })),
  ...estimateDetails2026.control_totals.map((controlTotal) => ({
    fact_id: `control_totals:${controlTotal.id}`,
    source_refs: controlTotal.source_refs,
  })),
];

const resourcesForControlTotal = (
  controlTotal: EstimateDetailControlTotal,
): readonly EstimateDetailResource[] => {
  if (controlTotal.resource_ids) {
    return controlTotal.resource_ids.flatMap((id) => {
      const resource = resourcesById.get(id);

      return resource ? [resource] : [];
    });
  }

  return estimateDetails2026.resources.filter(
    (resource) =>
      resource.estimate_row_id === controlTotal.estimate_row_id &&
      resource.cost_bucket === controlTotal.cost_bucket,
  );
};

const aggregateTotalForControl = (
  controlTotal: EstimateDetailControlTotal,
): number | undefined => {
  if (controlTotal.cost_bucket === 'other_cost') return;

  const costBucket = controlTotal.cost_bucket;
  const row = estimateRowsById.get(controlTotal.estimate_row_id);

  if (row) return row.baseline.breakdown[costBucket];

  const section = estimateSectionsById.get(controlTotal.estimate_row_id);

  if (!section) return;

  return round2(
    sum(
      section.rows.map(
        (sectionRow) => sectionRow.baseline.breakdown[costBucket],
      ),
    ),
  );
};

describe('estimate details 2026 dataset', () => {
  it('marks a section control for review when a resource changes', () => {
    const controlInput = lightingControlTotals.find(
      (controlTotal) => controlTotal.id === 'lighting-street-materials',
    );

    if (!controlInput) throw new Error('lighting materials control is missing');

    const resources = lightingResources.map((resource) =>
      resource.id === controlInput.resource_ids[0]
        ? {
            ...resource,
            total_rub: { ...resource.total_rub, value: 97_000 },
          }
        : resource,
    );
    const [controlTotal] = resolveSectionControlTotals(
      [controlInput],
      resources,
    );

    expect({
      detail_total_rub: controlTotal?.detail_total_rub?.value,
      aggregate_total_rub: controlTotal?.aggregate_total_rub?.value,
      delta_rub: controlTotal?.delta_rub,
      status: controlTotal?.status,
      reason: controlTotal?.needs_check?.reason,
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

  it('uses final.pdf as a gross control index', () => {
    const finalControls = estimateDetails2026.control_totals
      .filter((controlTotal) => controlTotal.control_source === 'final_pdf')
      .map((controlTotal) => ({
        id: controlTotal.id,
        estimate_row_id: controlTotal.estimate_row_id,
        source_total_rub: controlTotal.source_total_rub.value,
        detail_total_rub: controlTotal.detail_total_rub?.value ?? null,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        delta_rub: controlTotal.delta_rub ?? null,
        status: controlTotal.status,
        source_pdf: controlTotal.source_refs[0].pdf,
      }));

    expect(finalControls).toMatchSnapshot();
  });

  it('captures waste details from waste.pdf', () => {
    const wasteRowIds = new Set([
      'waste-operator-service',
      'waste-transfer-from-homes',
    ]);
    const workItems = estimateDetails2026.work_items
      .filter((item) => wasteRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => wasteRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          wasteRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету',
      );

    expect(sourceRef?.quote).toBe(
      'Рабочий ... 5147,3 664,15 3 418 555,10; Машинист 1460,0 934,32 1 364 107,20; Газель (GAZ 330232) 1460,0 318,02 464 303,42',
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

  it('keeps cleaning quote items enriched with source table fields', () => {
    const winterMechanizedPpeSource = resourcesById
      .get('cleaning-winter-mechanized-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'cleaning' &&
          ref.page === 12 &&
          ref.fragment ===
            'позиция 1.4 / средства охраны труда для зимней механизированной уборки',
      );
    const resourceStatementMaterialsSource = estimateDetails2026.control_totals
      .find(
        (controlTotal) =>
          controlTotal.id === 'cleaning-resource-statement-materials',
      )
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'cleaning' &&
          ref.page === 26 &&
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету / материалы',
      );

    expect({
      ppe: winterMechanizedPpeSource?.quote_items?.[0],
      resourceStatement: resourceStatementMaterialsSource?.quote_items?.[0],
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

  it('keeps landscaping quote items enriched with source table fields', () => {
    const treePpeSource = resourcesById
      .get('landscaping-trees-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'landscaping' &&
          ref.page === 15 &&
          ref.fragment ===
            'позиция 9.1 / средства охраны труда для ухода за деревьями, начало',
      );
    const resourceStatementSource = resourcesById
      .get('landscaping-mowing-trimmer-machine')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'landscaping' &&
          ref.page === 21 &&
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету',
      );
    const trimmerResourceStatementItem =
      resourceStatementSource?.quote_items?.find(
        (item) => item.label === 'Триммер бензиновый',
      );

    expect({
      ppe: treePpeSource?.quote_items?.[0],
      resourceStatement: trimmerResourceStatementItem,
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

  it('keeps improvement quote items enriched with source table fields', () => {
    const ppeSource = resourcesById
      .get('improvement-ppe-cotton-suit')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'improvement' &&
          ref.page === 14 &&
          ref.fragment === 'позиция 8.1 / средства охраны труда',
      );
    const toolsSource = resourcesById
      .get('improvement-scoop-shovel')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'improvement' &&
          ref.page === 14 &&
          ref.fragment === 'позиция 9.1 / износ оборудования и инструментов',
      );
    const scoopShovelItem = toolsSource?.quote_items?.find(
      (item) => item.label === 'Лопата совковая',
    );

    expect({
      ppe: ppeSource?.quote_items?.[0],
      tool: scoopShovelItem,
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

  it('keeps lighting quote items enriched with source table fields', () => {
    const resourceStatementSource = resourcesById
      .get('lighting-poles-paint-material')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'lighting' &&
          ref.page === 13 &&
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету',
      );
    const paintItem = resourceStatementSource?.quote_items?.find(
      (item) => item.label === 'Краска по металлу',
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

  it('keeps security quote items enriched with source table fields', () => {
    const skudSource = resourcesById
      .get('security-equipment-skud-labor')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'security' &&
          ref.page === 9 &&
          ref.fragment === 'позиция 3.1 / обслуживание системы СКУД TRASSIR',
      );
    const skudItem = skudSource?.quote_items?.find(
      (item) => item.label === 'Труд по обслуживанию системы СКУД TRASSIR',
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

  it('keeps waste quote items enriched with source table fields', () => {
    const staffSource = resourcesById
      .get('waste-transfer-worker-labor')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'waste' &&
          ref.page === 8 &&
          ref.fragment ===
            'нормативное штатное расписание для перемещения мусора',
      );
    const resourceStatementSource = resourcesById
      .get('waste-transfer-gazel-machine')
      ?.source_refs.find(
        (ref) =>
          ref.pdf === 'waste' &&
          ref.page === 12 &&
          ref.fragment ===
            'ресурсная ведомость по локальному ресурсному сметному расчету',
      );

    expect({
      staff: staffSource?.quote_items?.[0],
      resourceStatement: resourceStatementSource?.quote_items?.[2],
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

  it('migrates multi-position quote items in every section detail module', () => {
    const sectionPdfs = [
      'cleaning',
      'improvement',
      'landscaping',
      'lighting',
      'security',
      'waste',
    ] as const;
    const refsWithItems = detailFactsWithSourceRefs()
      .flatMap((fact) => fact.source_refs)
      .filter((ref) => ref.quote_items !== undefined);
    const migratedPdfs = [
      ...new Set(refsWithItems.map((ref) => ref.pdf)),
    ].sort();
    const invalidItems = refsWithItems.flatMap((ref) =>
      (ref.quote_items ?? []).flatMap((item, itemIndex) => {
        const errors = [
          item.label.trim() ? null : 'пустое название позиции',
          ref.quote?.trim() ? null : 'нет общей цитаты source_refs[].quote',
          item.resource_ids?.length === 0 ? 'пустой список ID ресурсов' : null,
        ].filter((error): error is string => error !== null);

        return errors.length > 0
          ? [
              {
                pdf: ref.pdf,
                page: ref.page,
                fragment: ref.fragment,
                item_index: itemIndex,
                errors,
              },
            ]
          : [];
      }),
    );

    expect(migratedPdfs).toEqual([...sectionPdfs].sort());
    expect(invalidItems).toEqual([]);
  });

  it('keeps public contract free of curation fragments', () => {
    const quoteItemLeaks = detailFactsWithSourceRefs()
      .flatMap((fact) =>
        fact.source_refs.map((ref) => ({ fact_id: fact.fact_id, ref })),
      )
      .flatMap(({ fact_id, ref }) =>
        (ref.quote_items ?? []).flatMap((item, itemIndex) => {
          const errors = [
            Object.prototype.hasOwnProperty.call(item, 'quote')
              ? 'лишнее поле quote'
              : null,
            hasOwnPropertyDeep(item, 'raw') ? 'лишнее поле raw' : null,
          ].filter((error): error is string => error !== null);

          return errors.length > 0
            ? [
                {
                  fact_id,
                  pdf: ref.pdf,
                  page: ref.page,
                  fragment: ref.fragment,
                  item_index: itemIndex,
                  errors,
                },
              ]
            : [];
        }),
      );

    expect(quoteItemLeaks).toEqual([]);
    expect(hasOwnPropertyDeep(estimateDetails2026, 'raw')).toBe(false);
  });

  it('keeps obvious multi-position resource quotes structured', () => {
    const missingStructuredItems = detailFactsWithSourceRefs()
      .flatMap((fact) =>
        fact.source_refs.map((ref) => ({ fact_id: fact.fact_id, ref })),
      )
      .filter(({ ref }) =>
        obviousMultiPositionQuotePatterns.some((pattern) =>
          pattern.test(ref.quote ?? ''),
        ),
      )
      .filter(({ ref }) => ref.quote_items === undefined)
      .map(({ fact_id, ref }) => ({
        fact_id,
        pdf: ref.pdf,
        page: ref.page,
        fragment: ref.fragment,
        quote: ref.quote,
      }));

    expect(missingStructuredItems).toEqual([]);
  });

  it('captures security details from security.pdf', () => {
    const securityRowIds = new Set([
      'security-access-control',
      'security-equipment-maintenance',
      'security-dispatch',
    ]);
    const workItems = estimateDetails2026.work_items
      .filter((item) => securityRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => securityRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          securityRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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

  it('captures lighting details from lighting.pdf', () => {
    const lightingRowIds = new Set([
      'lighting-street-maintenance',
      'lighting-electricity',
      'lighting-poles-repair',
      'lighting-power-system-repair',
    ]);
    const workItems = estimateDetails2026.work_items
      .filter((item) => lightingRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => lightingRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          lightingRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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

  it('captures landscaping details from landscaping.pdf', () => {
    const landscapingRowIds = new Set([
      'landscaping-mowing-ditches',
      'landscaping-trees-shrubs',
      'landscaping-ticks-hogweed',
      'landscaping-forest-care',
    ]);
    const workItems = estimateDetails2026.work_items.filter((item) =>
      landscapingRowIds.has(item.estimate_row_id),
    );
    const resources = estimateDetails2026.resources.filter((resource) =>
      landscapingRowIds.has(resource.estimate_row_id),
    );
    const grossControlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          landscapingRowIds.has(controlTotal.estimate_row_id) &&
          controlTotal.control_source === 'section_pdf' &&
          controlTotal.cost_bucket === 'gross',
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
      }));
    const resourceKinds = new Set(resources.map((resource) => resource.kind));

    expect(workItems).toHaveLength(4);
    expect(resources).toHaveLength(57);
    expect(grossControlTotals).toHaveLength(4);
    expect(resourceKinds).toEqual(
      new Set([
        'labor',
        'machinist_labor',
        'machine',
        'material',
        'contractor',
        'other_cost',
      ]),
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

  it('captures improvement details and the road/fence mismatch', () => {
    const improvementRowIds = new Set([
      'improvement-objects-maintenance',
      'improvement-road-surface-repair',
    ]);
    const workItems = estimateDetails2026.work_items
      .filter((item) => improvementRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources.filter((resource) =>
      improvementRowIds.has(resource.estimate_row_id),
    );
    const grossControlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          improvementRowIds.has(controlTotal.estimate_row_id) &&
          controlTotal.control_source === 'section_pdf' &&
          controlTotal.cost_bucket === 'gross',
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
      }));
    const needsCheckIds = [
      ...estimateDetails2026.work_items,
      ...estimateDetails2026.resources,
      ...estimateDetails2026.control_totals,
    ]
      .filter(
        (item) =>
          improvementRowIds.has(item.estimate_row_id) &&
          (!('control_source' in item) ||
            item.control_source === 'section_pdf') &&
          item.status === 'needs_check',
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
      'improvement-fence-repair-gross',
    ]);
  });

  it('captures winter mechanized cleaning details from cleaning.pdf', () => {
    const cleaningRowIds = new Set(['cleaning-winter-mechanized']);
    const workItems = estimateDetails2026.work_items
      .filter((item) => cleaningRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => cleaningRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          cleaningRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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
    const cleaningRowIds = new Set(['cleaning-summer-mechanized']);
    const workItems = estimateDetails2026.work_items
      .filter((item) => cleaningRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => cleaningRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          cleaningRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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
    const cleaningRowIds = new Set(['cleaning-summer-manual']);
    const workItems = estimateDetails2026.work_items
      .filter((item) => cleaningRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => cleaningRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          cleaningRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
      }));
    const ditchCleaningResource = estimateDetails2026.resources.find(
      (resource) =>
        resource.id === 'cleaning-summer-manual-ditch-cleaning-worker-labor',
    );

    expect(ditchCleaningResource).toMatchObject({
      quantity: { value: 24_337.7, unit: 'чел-час' },
    });
    expect(
      ditchCleaningResource?.source_refs
        .map((sourceRef) => sourceRef.quote ?? '')
        .join('\n'),
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
    const cleaningRowIds = new Set(['cleaning-winter-manual']);
    const workItems = estimateDetails2026.work_items
      .filter((item) => cleaningRowIds.has(item.estimate_row_id))
      .map((item) => ({
        id: item.id,
        estimate_row_id: item.estimate_row_id,
        service_ids: item.service_ids ?? [],
        status: item.status,
      }));
    const resources = estimateDetails2026.resources
      .filter((resource) => cleaningRowIds.has(resource.estimate_row_id))
      .map((resource) => ({
        id: resource.id,
        kind: resource.kind,
        cost_bucket: resource.cost_bucket,
        total_rub: resource.total_rub.value,
        status: resource.status,
      }));
    const controlTotals = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.control_source === 'section_pdf' &&
          cleaningRowIds.has(controlTotal.estimate_row_id),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        aggregate_total_rub: controlTotal.aggregate_total_rub?.value ?? null,
        status: controlTotal.status,
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
    const controlTotals = estimateDetails2026.control_totals
      .filter((controlTotal) =>
        controlTotal.id.startsWith('cleaning-resource-statement-'),
      )
      .map((controlTotal) => ({
        id: controlTotal.id,
        estimate_row_id: controlTotal.estimate_row_id,
        cost_bucket: controlTotal.cost_bucket,
        source_total_rub: controlTotal.source_total_rub.value,
        detail_total_rub: controlTotal.detail_total_rub?.value ?? null,
        status: controlTotal.status,
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

  it('keeps PDF source refs on every detail fact', () => {
    const facts = detailFactsWithSourceRefs();
    const missingRefs = facts
      .filter((fact) => fact.source_refs.length === 0)
      .map((fact) => fact.fact_id);
    const invalidRefs = facts.flatMap((fact) =>
      fact.source_refs.flatMap((ref, sourceRefIndex) => {
        const errors = [
          sourcePdfIds.has(ref.pdf) ? null : 'unknown pdf',
          Number.isInteger(ref.page) && ref.page > 0 ? null : 'invalid page',
          ref.fragment.trim() ? null : 'empty fragment',
        ].filter((error): error is string => error !== null);

        return errors.length > 0
          ? [
              {
                fact_id: fact.fact_id,
                source_ref_index: sourceRefIndex,
                errors,
              },
            ]
          : [];
      }),
    );

    expect({ missingRefs, invalidRefs }).toEqual({
      missingRefs: [],
      invalidRefs: [],
    });
  });

  it('keeps needs_check reasons and source refs actionable', () => {
    const invalidNeedsCheck = [
      ...estimateDetails2026.work_items.map((item) => ({
        fact_id: `work_items:${item.id}`,
        item,
      })),
      ...estimateDetails2026.resources.map((item) => ({
        fact_id: `resources:${item.id}`,
        item,
      })),
      ...estimateDetails2026.control_totals.map((item) => ({
        fact_id: `control_totals:${item.id}`,
        item,
      })),
    ].flatMap(({ fact_id, item }) => {
      if (item.status !== 'needs_check') return [];

      const checkSourceRefs = item.needs_check.source_refs ?? item.source_refs;
      const errors = [
        item.needs_check.reason.trim() ? null : 'empty reason',
        checkSourceRefs.length > 0 ? null : 'empty check source refs',
        checkSourceRefs.every(
          (ref) =>
            sourcePdfIds.has(ref.pdf) &&
            Number.isInteger(ref.page) &&
            ref.page > 0 &&
            ref.fragment.trim().length > 0,
        )
          ? null
          : 'invalid check source ref',
      ].filter((error): error is string => error !== null);

      return errors.length > 0 ? [{ fact_id, errors }] : [];
    });

    expect(invalidNeedsCheck).toEqual([]);
  });

  it('keeps every estimate_row_id backed by estimate-2026 rows or sections', () => {
    const missingRows = [
      ...estimateDetails2026.work_items.map((item) => ({
        fact_id: `work_items:${item.id}`,
        estimate_row_id: item.estimate_row_id,
      })),
      ...estimateDetails2026.resources.map((resource) => ({
        fact_id: `resources:${resource.id}`,
        estimate_row_id: resource.estimate_row_id,
      })),
      ...estimateDetails2026.control_totals.map((controlTotal) => ({
        fact_id: `control_totals:${controlTotal.id}`,
        estimate_row_id: controlTotal.estimate_row_id,
      })),
    ].filter((item) => !estimateItemIds.has(item.estimate_row_id));

    expect(missingRows).toEqual([]);
  });

  it('keeps every service_id backed by full-2026 when present', () => {
    const missingServices = estimateDetails2026.work_items.flatMap((item) =>
      (item.service_ids ?? [])
        .filter((serviceId) => !serviceIds.has(serviceId))
        .map((serviceId) => ({
          work_item_id: item.id,
          service_id: serviceId,
        })),
    );

    expect(missingServices).toEqual([]);
  });

  it('keeps resource sums aligned with control totals within explicit tolerance', () => {
    const missingTolerance = estimateDetails2026.control_totals
      .filter(
        (controlTotal) =>
          controlTotal.tolerance_rub === undefined ||
          !Number.isFinite(controlTotal.tolerance_rub) ||
          controlTotal.tolerance_rub < 0,
      )
      .map((controlTotal) => controlTotal.id);
    const missingResourceIds = estimateDetails2026.control_totals.flatMap(
      (controlTotal) =>
        (controlTotal.resource_ids ?? [])
          .filter((id) => !resourcesById.has(id))
          .map((resourceId) => ({
            control_total_id: controlTotal.id,
            resource_id: resourceId,
          })),
    );
    const sumMismatches: readonly ControlTotalSumMismatch[] =
      estimateDetails2026.control_totals.flatMap(
        (controlTotal): readonly ControlTotalSumMismatch[] => {
          if (controlTotal.control_source === 'final_pdf') {
            return [];
          }

          if (controlTotal.tolerance_rub === undefined) {
            return [];
          }

          const declaredTotal =
            controlTotal.detail_total_rub?.value ??
            controlTotal.source_total_rub.value;
          const resources = resourcesForControlTotal(controlTotal);
          const resourcesWithoutTotal = resources
            .filter((resource) => resource.total_rub.value === null)
            .map((resource) => resource.id);

          if (declaredTotal === null || resourcesWithoutTotal.length > 0) {
            return [
              {
                control_total_id: controlTotal.id,
                issue: 'missing comparable totals',
                declared_total_rub: declaredTotal,
                resources_without_total: resourcesWithoutTotal,
              },
            ];
          }

          const resourceTotal = round2(
            sum(resources.map((resource) => resource.total_rub.value ?? 0)),
          );
          const delta = round2(resourceTotal - declaredTotal);

          return Math.abs(delta) <= controlTotal.tolerance_rub
            ? []
            : [
                {
                  control_total_id: controlTotal.id,
                  issue: 'sum mismatch',
                  declared_total_rub: declaredTotal,
                  resource_total_rub: resourceTotal,
                  delta_rub: delta,
                  tolerance_rub: controlTotal.tolerance_rub,
                },
              ];
        },
      );
    const derivedValueMismatches = estimateDetails2026.control_totals.flatMap(
      (controlTotal) => {
        if (controlTotal.control_source === 'final_pdf') return [];

        const detailTotal = controlTotal.detail_total_rub?.value;
        const aggregateTotal = controlTotal.aggregate_total_rub?.value;
        const expectedAggregateTotal = aggregateTotalForControl(controlTotal);

        if (
          detailTotal === null ||
          detailTotal === undefined ||
          aggregateTotal === null ||
          expectedAggregateTotal === undefined
        ) {
          return [];
        }

        const expectedDelta = round2(detailTotal - expectedAggregateTotal);

        return aggregateTotal === expectedAggregateTotal &&
          controlTotal.delta_rub === expectedDelta
          ? []
          : [
              {
                control_total_id: controlTotal.id,
                aggregate_total_rub: aggregateTotal,
                expected_aggregate_total_rub: expectedAggregateTotal,
                delta_rub: controlTotal.delta_rub,
                expected_delta_rub: expectedDelta,
              },
            ];
      },
    );
    const uncheckedMismatches = estimateDetails2026.control_totals.flatMap(
      (controlTotal) => {
        const tolerance = controlTotal.tolerance_rub;

        if (
          controlTotal.control_source === 'final_pdf' ||
          controlTotal.status === 'needs_check' ||
          tolerance === undefined
        ) {
          return [];
        }

        const sourceTotal = controlTotal.source_total_rub.value;
        const detailTotal = controlTotal.detail_total_rub?.value;
        const aggregateTotal = controlTotal.aggregate_total_rub?.value;

        if (
          sourceTotal === null ||
          detailTotal === null ||
          detailTotal === undefined
        ) {
          return [controlTotal.id];
        }

        const deltas = [round2(detailTotal - sourceTotal)];

        if (aggregateTotal !== null && aggregateTotal !== undefined) {
          deltas.push(
            round2(aggregateTotal - sourceTotal),
            round2(detailTotal - aggregateTotal),
          );
        }

        return deltas.some((delta) => Math.abs(delta) > tolerance)
          ? [controlTotal.id]
          : [];
      },
    );

    expect({
      missingTolerance,
      missingResourceIds,
      sumMismatches,
      derivedValueMismatches,
      uncheckedMismatches,
    }).toEqual({
      missingTolerance: [],
      missingResourceIds: [],
      sumMismatches: [],
      derivedValueMismatches: [],
      uncheckedMismatches: [],
    });
  });
});
