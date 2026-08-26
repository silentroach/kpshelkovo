import { describe, expect, it } from 'vitest';

import type {
  EstimateDetailDataset,
  EstimateDetailSourceRef,
} from './detail-schema';
import { buildPublicEstimateDetails2026Json } from './detail-json';
import type { PublicEstimateDetailDataset } from './detail-public';

const structuredSource = {
  pdf: 'cleaning',
  page: 2,
  fragment: 'Материалы',
  quote: 'Необработанная строка PDF',
  quote_items: [
    {
      label: 'Мешки для мусора',
      resource_ids: ['resource-1'],
      quantity: { value: 10, unit: 'шт.' },
      total_rub: { value: 500 },
    },
  ],
} satisfies EstimateDetailSourceRef;

const plainSource = {
  pdf: 'cleaning',
  page: 3,
  fragment: 'Итого',
  quote: 'Итого 500 руб.',
} satisfies EstimateDetailSourceRef;

const fixture = {
  schema_version: '1',
  dataset_id: 'estimate-details-2026',
  title: 'Тестовая детальная смета',
  year: 2026,
  source_pdfs: [{ pdf: 'cleaning', title: 'Уборка' }],
  curation_notes: ['Тестовый набор'],
  work_items: [
    {
      id: 'work-1',
      title: 'Уборка',
      estimate_row_id: 'row-1',
      source_refs: [structuredSource],
      status: 'verified',
      status_label_ru: 'Проверено',
    },
  ],
  resources: [
    {
      id: 'resource-1',
      work_item_id: 'work-1',
      estimate_row_id: 'row-1',
      kind: 'material',
      title: 'Мешки для мусора',
      cost_bucket: 'materials',
      total_rub: { value: 500 },
      source_refs: [structuredSource, plainSource],
      status: 'needs_check',
      status_label_ru: 'Требует проверки',
      needs_check: {
        reason: 'Нужно сверить количество',
        source_refs: [structuredSource],
      },
    },
  ],
  control_totals: [
    {
      id: 'total-1',
      estimate_row_id: 'row-1',
      control_source: 'section_pdf',
      cost_bucket: 'materials',
      source_total_rub: { value: 500 },
      source_refs: [plainSource],
      status: 'derived',
      status_label_ru: 'Рассчитано',
    },
  ],
} satisfies EstimateDetailDataset;

const parseFixture = (
  dataset: EstimateDetailDataset = fixture,
): PublicEstimateDetailDataset =>
  JSON.parse(
    buildPublicEstimateDetails2026Json(dataset),
  ) as PublicEstimateDetailDataset;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

describe('estimate details public JSON', () => {
  it('publishes every full source once', () => {
    const payload = parseFixture();
    const sourceIds = Object.keys(payload.sources);
    const uniqueIds = new Set(sourceIds);

    expect({
      idsUseDocumentedFormat: sourceIds.every((id) => /^s[1-9]\d*$/.test(id)),
      sourceCount: sourceIds.length,
      uniqueIdCount: uniqueIds.size,
    }).toMatchInlineSnapshot(`
      {
        "idsUseDocumentedFormat": true,
        "sourceCount": 2,
        "uniqueIdCount": 2,
      }
    `);
  });

  it('resolves source references from facts and needs_check', () => {
    const payload = parseFixture();
    const sourceIds = new Set(Object.keys(payload.sources));
    const facts = [
      ...payload.work_items,
      ...payload.resources,
      ...payload.control_totals,
    ];
    const factRefs = facts.flatMap((fact) => fact.source_refs);
    const checkRefs = facts.flatMap(
      (fact) => fact.needs_check?.source_refs ?? [],
    );

    expect({
      factRefCount: factRefs.length,
      factRefsResolve: factRefs.every((id) => sourceIds.has(id)),
      needsCheckRefCount: checkRefs.length,
      needsCheckRefsResolve: checkRefs.every((id) => sourceIds.has(id)),
    }).toMatchInlineSnapshot(`
      {
        "factRefCount": 4,
        "factRefsResolve": true,
        "needsCheckRefCount": 1,
        "needsCheckRefsResolve": true,
      }
    `);
  });

  it('keeps serialization deterministic', () => {
    const json = buildPublicEstimateDetails2026Json(fixture);

    expect(buildPublicEstimateDetails2026Json(fixture)).toBe(json);
  });

  it('omits redundant public fields without losing review statuses', () => {
    const payload = parseFixture();
    const structuredPublicSource = Object.values(payload.sources).find(
      (source) => source.quote_items !== undefined,
    );
    const verifiedWorkItem = payload.work_items[0];
    const needsCheckResource = payload.resources[0];

    expect({
      structuredSourceHasRawQuote:
        structuredPublicSource !== undefined &&
        hasOwn(structuredPublicSource, 'quote'),
      verifiedHasStatus:
        verifiedWorkItem !== undefined && hasOwn(verifiedWorkItem, 'status'),
      verifiedHasStatusLabel:
        verifiedWorkItem !== undefined &&
        hasOwn(verifiedWorkItem, 'status_label_ru'),
      reviewStatus: needsCheckResource?.status,
      reviewStatusLabel: needsCheckResource?.status_label_ru,
    }).toMatchInlineSnapshot(`
      {
        "reviewStatus": "needs_check",
        "reviewStatusLabel": "Требует проверки",
        "structuredSourceHasRawQuote": false,
        "verifiedHasStatus": false,
        "verifiedHasStatusLabel": false,
      }
    `);
  });
});
