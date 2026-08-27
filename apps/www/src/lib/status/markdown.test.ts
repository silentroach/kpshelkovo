import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildStatusCalendarProjection,
  toStatusCalendarRecord,
} from './calendar';
import { getStatusMonthJournal } from './journal';
import type { StatusIncidentWithDetail, StatusServiceSummary } from './types';

let buildStatusHomeMarkdown: typeof import('./markdown').buildStatusHomeMarkdown;
let buildStatusIncidentMarkdown: typeof import('./markdown').buildStatusIncidentMarkdown;
let buildStatusMonthMarkdown: typeof import('./markdown').buildStatusMonthMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({
    buildStatusHomeMarkdown,
    buildStatusIncidentMarkdown,
    buildStatusMonthMarkdown,
  } = await import('./markdown'));
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
  phase: 'resolved',
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
      calendar: buildStatusCalendarProjection(
        [toStatusCalendarRecord(testIncident)],
        new Date('2026-05-04T09:00:00+03:00').valueOf(),
      ),
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

describe('buildStatusMonthMarkdown', () => {
  it('uses the calendar day and record order', () => {
    const carryover = incident({
      id: '2026/05/carryover',
      title: 'Продолжающееся отключение',
      slug: 'carryover',
      url: '/status/incidents/2026/05/carryover/',
      markdownUrl: '/status/incidents/2026/05/carryover/index.md',
      canonical: 'https://example.com/status/incidents/2026/05/carryover/',
      started: {
        at: new Date('2026-05-01T20:00:00.000Z'),
        iso: '2026-05-01T23:00:00+03:00',
        hasTime: true,
      },
      ended: {
        at: new Date('2026-05-01T23:30:00.000Z'),
        iso: '2026-05-02T02:30:00+03:00',
        hasTime: true,
      },
      sortStartedAt: new Date('2026-05-01T20:00:00.000Z').valueOf(),
      sortLastChangeAt: new Date('2026-05-01T23:30:00.000Z').valueOf(),
      duration: { totalMinutes: 210 },
    });
    const newIncident = incident({
      id: '2026/05/new-incident',
      title: 'Новое отключение',
      slug: 'new-incident',
      url: '/status/incidents/2026/05/new-incident/',
      markdownUrl: '/status/incidents/2026/05/new-incident/index.md',
      canonical: 'https://example.com/status/incidents/2026/05/new-incident/',
      started: {
        at: new Date('2026-05-01T22:00:00.000Z'),
        iso: '2026-05-02T01:00:00+03:00',
        hasTime: true,
      },
      ended: {
        at: new Date('2026-05-01T23:00:00.000Z'),
        iso: '2026-05-02T02:00:00+03:00',
        hasTime: true,
      },
      sortStartedAt: new Date('2026-05-01T22:00:00.000Z').valueOf(),
      sortLastChangeAt: new Date('2026-05-01T23:00:00.000Z').valueOf(),
      duration: { totalMinutes: 60 },
    });
    const calendar = buildStatusCalendarProjection(
      [carryover, newIncident].map(toStatusCalendarRecord),
      new Date('2026-05-03T09:00:00+03:00').valueOf(),
    );
    const journal = getStatusMonthJournal(
      {
        calendar,
        byId: new Map([
          [carryover.id, carryover],
          [newIncident.id, newIncident],
        ]),
      },
      2026,
      5,
    );

    if (!journal) {
      throw new Error('Expected May status journal');
    }

    expect(buildStatusMonthMarkdown(journal)).toMatchInlineSnapshot(`
      "# Статусы за май 2026 года

      ## 2 мая 2026

      - [Продолжающееся отключение](https://example.com/status/incidents/2026/05/carryover/index.md) — Электричество; Инцидент; восстановлено; 1 мая, 23:00 - 2 мая, 02:30 (3 ч. 30 мин.)
      - [Новое отключение](https://example.com/status/incidents/2026/05/new-incident/index.md) — Электричество; Инцидент; восстановлено; 2 мая, 01:00 - 02:00 (1 ч.)

      ## 1 мая 2026

      - [Продолжающееся отключение](https://example.com/status/incidents/2026/05/carryover/index.md) — Электричество; Инцидент; восстановлено; 1 мая, 23:00 - 2 мая, 02:30 (3 ч. 30 мин.)
      "
    `);
  });
});
