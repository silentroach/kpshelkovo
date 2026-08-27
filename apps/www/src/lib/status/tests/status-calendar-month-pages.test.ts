/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type {
  StatusCalendarDay,
  StatusCalendarMonth,
  StatusCalendarYear,
} from '@/lib/status/calendar.types';
import type { StatusIncident } from '@/lib/status/types';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as StatusCalendarMonthPage from '@/pages/status/calendar/[year]/[month]/index.astro';
import * as StatusCalendarMonthMarkdownRoute from '@/pages/status/calendar/[year]/[month]/index.md';

const fixtures = vi.hoisted(() => {
  const carryover = {
    id: '2026/08/carryover',
    title: 'Продолжающееся отключение',
    service: 'electricity' as const,
    kind: 'incident' as const,
    year: 2026,
    month: 8,
    slug: 'carryover',
    started: {
      at: new Date('2026-08-23T20:00:00.000Z'),
      iso: '2026-08-23T23:00:00+03:00',
      hasTime: true,
    },
    ended: {
      at: new Date('2026-08-23T23:00:00.000Z'),
      iso: '2026-08-24T02:00:00+03:00',
      hasTime: true,
    },
    phase: 'resolved' as const,
    appliesToAllAreas: true,
    areas: [],
    hasPage: true as const,
    url: '/status/incidents/2026/08/carryover/',
    markdownUrl: '/status/incidents/2026/08/carryover/index.md',
    canonical: 'https://example.com/status/incidents/2026/08/carryover/',
    body: '',
    mentions: [],
    sortStartedAt: new Date('2026-08-23T20:00:00.000Z').valueOf(),
    sortLastChangeAt: new Date('2026-08-23T23:00:00.000Z').valueOf(),
    duration: { totalMinutes: 180 },
  };
  const listOnly = {
    id: '2026/08/list-only-maintenance',
    title: 'Плановые работы без страницы',
    service: 'water' as const,
    kind: 'maintenance' as const,
    year: 2026,
    month: 8,
    slug: 'list-only-maintenance',
    started: {
      at: new Date('2026-08-24T05:00:00.000Z'),
      iso: '2026-08-24T08:00:00+03:00',
      hasTime: true,
    },
    ended: {
      at: new Date('2026-08-24T07:00:00.000Z'),
      iso: '2026-08-24T10:00:00+03:00',
      hasTime: true,
    },
    phase: 'resolved' as const,
    appliesToAllAreas: true,
    areas: [],
    sourceUrl: 'https://example.com/list-only-source',
    hasPage: false as const,
    body: '',
    mentions: [],
    sortStartedAt: new Date('2026-08-24T05:00:00.000Z').valueOf(),
    sortLastChangeAt: new Date('2026-08-24T07:00:00.000Z').valueOf(),
    duration: { totalMinutes: 120 },
  };
  const older = {
    id: '2026/08/older',
    title: 'Более раннее отключение',
    service: 'internet' as const,
    kind: 'incident' as const,
    year: 2026,
    month: 8,
    slug: 'older',
    started: {
      at: new Date('2026-08-23T09:00:00.000Z'),
      iso: '2026-08-23T12:00:00+03:00',
      hasTime: true,
    },
    ended: {
      at: new Date('2026-08-23T10:00:00.000Z'),
      iso: '2026-08-23T13:00:00+03:00',
      hasTime: true,
    },
    phase: 'resolved' as const,
    appliesToAllAreas: true,
    areas: [],
    hasPage: true as const,
    url: '/status/incidents/2026/08/older/',
    markdownUrl: '/status/incidents/2026/08/older/index.md',
    canonical: 'https://example.com/status/incidents/2026/08/older/',
    body: '',
    mentions: [],
    sortStartedAt: new Date('2026-08-23T09:00:00.000Z').valueOf(),
    sortLastChangeAt: new Date('2026-08-23T10:00:00.000Z').valueOf(),
    duration: { totalMinutes: 60 },
  };
  const julyMaintenance = {
    ...listOnly,
    id: '2026/07/maintenance',
    title: 'Июльские плановые работы',
    year: 2026,
    month: 7,
    slug: 'maintenance',
    started: {
      at: new Date('2026-07-01T05:00:00.000Z'),
      iso: '2026-07-01T08:00:00+03:00',
      hasTime: true,
    },
    ended: {
      at: new Date('2026-07-01T07:00:00.000Z'),
      iso: '2026-07-01T10:00:00+03:00',
      hasTime: true,
    },
    sortStartedAt: new Date('2026-07-01T05:00:00.000Z').valueOf(),
    sortLastChangeAt: new Date('2026-07-01T07:00:00.000Z').valueOf(),
  };
  const augustDays: readonly StatusCalendarDay[] = [
    {
      id: '2026-08-24',
      year: 2026,
      month: 8,
      day: 24,
      kind: 'mixed' as const,
      incidentCount: 1,
      maintenanceCount: 1,
      recordIds: [carryover.id, listOnly.id],
    },
    {
      id: '2026-08-23',
      year: 2026,
      month: 8,
      day: 23,
      kind: 'incident' as const,
      incidentCount: 2,
      maintenanceCount: 0,
      recordIds: [older.id, carryover.id],
    },
  ];
  const august: StatusCalendarMonth = {
    id: '2026/08',
    year: 2026,
    month: 8,
    days: augustDays,
  };
  const julyDay: StatusCalendarDay = {
    id: '2026-07-01',
    year: 2026,
    month: 7,
    day: 1,
    kind: 'maintenance',
    incidentCount: 0,
    maintenanceCount: 1,
    recordIds: [julyMaintenance.id],
  };
  const july: StatusCalendarMonth = {
    id: '2026/07',
    year: 2026,
    month: 7,
    days: [julyDay],
  };

  return {
    data: {
      incidents: [listOnly, carryover, older, julyMaintenance],
      active: [],
      services: [],
      calendar: {
        years: [{ year: 2026, months: [august, july] }],
        byYear: new Map<number, StatusCalendarYear>([
          [2026, { year: 2026, months: [august, july] }],
        ]),
        byMonth: new Map<string, StatusCalendarMonth>([
          [august.id, august],
          [july.id, july],
        ]),
        byDay: new Map<string, StatusCalendarDay>([
          ...augustDays.map((day) => [day.id, day] as const),
          [julyDay.id, julyDay],
        ]),
      },
      byId: new Map<string, StatusIncident>([
        [carryover.id, carryover],
        [listOnly.id, listOnly],
        [older.id, older],
        [julyMaintenance.id, julyMaintenance],
      ]),
      byService: new Map(),
    },
  };
});

vi.mock('@/lib/status/load', () => ({
  loadStatusData: async () => fixtures.data,
}));

const parseHtml = (html: string) => {
  const document = new Window().document;
  document.write(html);

  return document;
};

const cleanText = (value: string): string => value.replace(/\s+/gu, ' ').trim();

const htmlJournal = (document: ReturnType<typeof parseHtml>) =>
  [...document.querySelectorAll('[data-status-calendar-day]')].map(
    (section) => {
      const heading = section.querySelector('h2');
      const marker = heading?.querySelector('[data-status-calendar-marker]');

      return {
        id: heading?.id,
        tabindex: heading?.getAttribute('tabindex'),
        heading: cleanText(heading?.textContent ?? ''),
        marker: marker?.getAttribute('data-status-calendar-marker'),
        markerRole: marker?.getAttribute('role'),
        markerLabel: marker?.getAttribute('aria-label'),
        date: cleanText(heading?.querySelector('time')?.textContent ?? ''),
        records: [...section.querySelectorAll('article h3')].map((record) => ({
          title: cleanText(record.textContent),
          href: record.querySelector('a')?.getAttribute('href'),
        })),
      };
    },
  );

const markdownJournal = (markdown: string) =>
  markdown
    .split(/^## /mu)
    .slice(1)
    .map((section) => {
      const [date = ''] = section.split('\n');
      const records = [
        ...section.matchAll(/^- (?:\[([^\]]+)\]\([^)]+\)|([^—\n]+?)) —/gmu),
      ].map(([, linkedTitle, plainTitle]) =>
        cleanText(linkedTitle ?? plainTitle ?? ''),
      );

      return { date: cleanText(date), records };
    });

const renderMarkdownRoute = (
  params: Readonly<Record<string, string | undefined>>,
): Response | Promise<Response> =>
  (
    StatusCalendarMonthMarkdownRoute.GET as (context: {
      readonly params: Readonly<Record<string, string | undefined>>;
    }) => Response | Promise<Response>
  )({ params });

describe('/status/calendar/YYYY/MM/', () => {
  it('creates matching HTML and Markdown paths only for affected months', async () => {
    const [htmlPaths, markdownPaths] = await Promise.all([
      StatusCalendarMonthPage.getStaticPaths(),
      StatusCalendarMonthMarkdownRoute.getStaticPaths(),
    ]);

    expect({ htmlPaths, markdownPaths }).toMatchInlineSnapshot(`
      {
        "htmlPaths": [
          {
            "params": {
              "month": "08",
              "year": "2026",
            },
          },
          {
            "params": {
              "month": "07",
              "year": "2026",
            },
          },
        ],
        "markdownPaths": [
          {
            "params": {
              "month": "08",
              "year": "2026",
            },
          },
          {
            "params": {
              "month": "07",
              "year": "2026",
            },
          },
        ],
      }
    `);
  });

  it('renders descending ISO day anchors and list-only records without a detail link', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(
      StatusCalendarMonthPage.default,
      {
        params: { year: '2026', month: '08' },
        request: new Request(
          'https://example.com/status/calendar/2026/08/#2026-08-24',
        ),
        partial: false,
      },
    );
    const document = parseHtml(html);

    expect({
      days: htmlJournal(document),
      metadata: {
        robots: document
          .querySelector('meta[name="robots"]')
          ?.getAttribute('content'),
        markdownAlternate: document
          .querySelector('link[rel="alternate"][type="text/markdown"]')
          ?.getAttribute('href'),
        pagefindRoot: document.querySelector('[data-pagefind-root]')?.tagName,
      },
    }).toMatchInlineSnapshot(`
      {
        "days": [
          {
            "date": "24 августа 2026",
            "heading": "24 августа 2026",
            "id": "2026-08-24",
            "marker": "mixed",
            "markerLabel": "Есть инциденты и плановые работы",
            "markerRole": "img",
            "records": [
              {
                "href": "/status/incidents/2026/08/carryover/",
                "title": "Продолжающееся отключение",
              },
              {
                "href": undefined,
                "title": "Плановые работы без страницы",
              },
            ],
            "tabindex": "-1",
          },
          {
            "date": "23 августа 2026",
            "heading": "23 августа 2026",
            "id": "2026-08-23",
            "marker": "incident",
            "markerLabel": "Есть инциденты",
            "markerRole": "img",
            "records": [
              {
                "href": "/status/incidents/2026/08/older/",
                "title": "Более раннее отключение",
              },
              {
                "href": "/status/incidents/2026/08/carryover/",
                "title": "Продолжающееся отключение",
              },
            ],
            "tabindex": "-1",
          },
        ],
        "metadata": {
          "markdownAlternate": undefined,
          "pagefindRoot": undefined,
          "robots": "noindex, nofollow",
        },
      }
    `);
  });

  it('keeps the same days and records in HTML and Markdown', async () => {
    const container = await createAstroContainer();
    const params = { year: '2026', month: '08' };
    const request = new Request('https://example.com/status/calendar/2026/08/');
    const [html, markdownResponse] = await Promise.all([
      container.renderToString(StatusCalendarMonthPage.default, {
        params,
        request,
        partial: false,
      }),
      renderMarkdownRoute(params),
    ]);
    const htmlDays = htmlJournal(parseHtml(html)).map((day) => ({
      date: day.date,
      records: day.records.map((record) => record.title),
    }));
    const markdown = await markdownResponse.text();
    const markdownDays = markdownJournal(markdown);

    expect(markdownDays).toEqual(htmlDays);
    expect({
      days: markdownDays,
      contentType: markdownResponse.headers.get('Content-Type'),
      robots: markdownResponse.headers.get('X-Robots-Tag'),
      listOnlyTitleIsLinked: markdown.includes(
        '[Плановые работы без страницы]',
      ),
    }).toMatchInlineSnapshot(`
      {
        "contentType": "text/markdown; charset=utf-8",
        "days": [
          {
            "date": "24 августа 2026",
            "records": [
              "Продолжающееся отключение",
              "Плановые работы без страницы",
            ],
          },
          {
            "date": "23 августа 2026",
            "records": [
              "Более раннее отключение",
              "Продолжающееся отключение",
            ],
          },
        ],
        "listOnlyTitleIsLinked": false,
        "robots": "noindex, follow",
      }
    `);
  });
});
