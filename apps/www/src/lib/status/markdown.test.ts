import { beforeAll, describe, expect, it } from 'vitest';

import type { StatusIncidentWithDetail, StatusServiceSummary } from './types';

let buildStatusHomeMarkdown: typeof import('./markdown').buildStatusHomeMarkdown;
let buildStatusIncidentMarkdown: typeof import('./markdown').buildStatusIncidentMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildStatusHomeMarkdown, buildStatusIncidentMarkdown } =
    await import('./markdown'));
});

const incident = (
  input?: Partial<StatusIncidentWithDetail>,
): StatusIncidentWithDetail => ({
  id: '2026/05/electricity-river-outage',
  title: 'Отключение электричества в Шелково Ривер',
  service: 'electricity',
  kind: 'incident',
  year: 2026,
  month: 5,
  slug: 'electricity-river-outage',
  url: '/status/incidents/2026/05/electricity-river-outage/',
  markdownUrl: '/status/incidents/2026/05/electricity-river-outage/index.md',
  canonical:
    'https://example.com/status/incidents/2026/05/electricity-river-outage/',
  started: {
    at: new Date('2026-05-01T04:32:00.000Z'),
    iso: '2026-05-01T07:32:00+03:00',
    hasTime: true,
  },
  ended: {
    at: new Date('2026-05-01T13:38:00.000Z'),
    iso: '2026-05-01T16:38:00+03:00',
    hasTime: true,
  },
  isActive: false,
  appliesToAllAreas: false,
  areas: ['river'],
  sourceUrl: 'https://example.com/source',
  hasPage: true,
  body: 'Основной текст инцидента.',
  mentions: [],
  sortStartedAt: new Date('2026-05-01T04:32:00.000Z').valueOf(),
  sortLastChangeAt: new Date('2026-05-01T13:38:00.000Z').valueOf(),
  duration: { totalMinutes: 546 },
  ...input,
});

const summary = (
  input?: Partial<StatusServiceSummary>,
): StatusServiceSummary => ({
  service: 'electricity',
  serviceStatus: 'green',
  incidents: [incident()],
  activeIncidents: [],
  activeMaintenance: [],
  daysWithoutIncidents: { mode: 'count', days: 3 },
  ...input,
});

describe('buildStatusHomeMarkdown', () => {
  it('keeps service and incident public Markdown links', () => {
    const testIncident = incident();
    const testSummary = summary({ incidents: [testIncident] });
    const markdown = buildStatusHomeMarkdown({
      incidents: [testIncident],
      active: [],
      services: [testSummary],
      byId: new Map([[testIncident.id, testIncident]]),
      byService: new Map([['electricity', testSummary]]),
    });

    expect(markdown).toMatchInlineSnapshot(`
      "# Статус КП Шелково

      Текстовая сводка состояния сервисов КП Шелково: активные инциденты, плановые работы и история отключений.

      ## Сервисы

      - [Электричество](https://example.com/status/electricity/index.md) — В норме; последняя запись: [Отключение электричества в Шелково Ривер](https://example.com/status/incidents/2026/05/electricity-river-outage/index.md)

      ## История

      - [Отключение электричества в Шелково Ривер](https://example.com/status/incidents/2026/05/electricity-river-outage/index.md) — Электричество; Инцидент; восстановлено; 1 мая, 07:32 - 16:38 (9 ч. 6 мин.)
      "
    `);
  });
});

describe('buildStatusIncidentMarkdown', () => {
  it('puts incident metadata into frontmatter and starts body without a wrapper heading', () => {
    expect(buildStatusIncidentMarkdown(incident())).toMatchInlineSnapshot(`
      "---
      title: Отключение электричества в Шелково Ривер
      service:
        id: electricity
        name: Электричество
      kind:
        id: incident
        name: Инцидент
      phase: восстановлено
      startedAt: 2026-05-01T07:32:00+03:00
      startedHasTime: true
      endedAt: 2026-05-01T16:38:00+03:00
      endedHasTime: true
      areas:
        - Шелково Ривер
      sourceUrl: https://example.com/source
      ---

      # Отключение электричества в Шелково Ривер

      Основной текст инцидента.
      "
    `);
  });

  it('omits settlement-wide areas from frontmatter', () => {
    const markdown = buildStatusIncidentMarkdown(
      incident({
        appliesToAllAreas: true,
        areas: ['river', 'forest', 'park', 'village'],
      }),
    );

    expect(markdown).not.toContain('\nareas:\n');
    expect(markdown).not.toContain('## Метаданные');
    expect(markdown).not.toContain('## Описание');
  });

  it('parses incident body as Markdown fragment without nested frontmatter', () => {
    expect(
      buildStatusIncidentMarkdown(
        incident({
          body: [
            '---',
            'draft: true',
            '---',
            '',
            'Тело с [ссылкой](https://example.com/body).',
            '',
            '- пункт 1',
          ].join('\n'),
        }),
      ),
    ).toMatchInlineSnapshot(`
      "---
      title: Отключение электричества в Шелково Ривер
      service:
        id: electricity
        name: Электричество
      kind:
        id: incident
        name: Инцидент
      phase: восстановлено
      startedAt: 2026-05-01T07:32:00+03:00
      startedHasTime: true
      endedAt: 2026-05-01T16:38:00+03:00
      endedHasTime: true
      areas:
        - Шелково Ривер
      sourceUrl: https://example.com/source
      ---

      # Отключение электричества в Шелково Ривер

      Тело с [ссылкой](https://example.com/body).

      - пункт 1
      "
    `);
  });
});
