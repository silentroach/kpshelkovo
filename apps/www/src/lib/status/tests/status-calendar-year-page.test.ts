/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import type {
  StatusCalendarDay,
  StatusCalendarMonth,
  StatusCalendarYear,
} from '@/lib/status/calendar.types';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as StatusCalendarYearPage from '@/pages/status/calendar/[year]/index.astro';
import * as StatusCalendarYearMarkdownRoute from '@/pages/status/calendar/[year]/index.md';

const fixtures = vi.hoisted(() => {
  const januaryDay: StatusCalendarDay = {
    id: '2026-01-01',
    year: 2026,
    month: 1,
    day: 1,
    kind: 'maintenance',
    incidentCount: 0,
    maintenanceCount: 1,
    recordIds: ['2026/01/maintenance'],
  };
  const augustDays: readonly StatusCalendarDay[] = [
    {
      id: '2026-08-24',
      year: 2026,
      month: 8,
      day: 24,
      kind: 'mixed',
      incidentCount: 2,
      maintenanceCount: 1,
      recordIds: [
        '2026/08/incident-one',
        '2026/08/incident-two',
        '2026/08/maintenance',
      ],
    },
    {
      id: '2026-08-23',
      year: 2026,
      month: 8,
      day: 23,
      kind: 'incident',
      incidentCount: 1,
      maintenanceCount: 0,
      recordIds: ['2026/08/incident-one'],
    },
  ];
  const january: StatusCalendarMonth = {
    id: '2026/01',
    year: 2026,
    month: 1,
    days: [januaryDay],
  };
  const august: StatusCalendarMonth = {
    id: '2026/08',
    year: 2026,
    month: 8,
    days: augustDays,
  };
  const year: StatusCalendarYear = {
    year: 2026,
    months: [august, january],
  };
  const allDays = [januaryDay, ...augustDays];

  return {
    data: {
      incidents: [],
      active: [],
      services: [],
      calendar: {
        buildYear: 2026,
        years: [year],
        byYear: new Map([[year.year, year]]),
        byMonth: new Map([
          [august.id, august],
          [january.id, january],
        ]),
        byDay: new Map(allDays.map((day) => [day.id, day])),
      },
      byId: new Map(),
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

const DEFAULT_NOW = new Date('2026-08-27T12:00:00+03:00');

const renderPage = async (year = 2026) => {
  const container = await createAstroContainer();

  return container.renderToString(StatusCalendarYearPage.default, {
    params: { year: String(year) },
    request: new Request(`https://example.com/status/calendar/${year}/`),
    partial: false,
  });
};

const renderMarkdownRoute = (year = 2026): Response | Promise<Response> =>
  (
    StatusCalendarYearMarkdownRoute.GET as (context: {
      readonly params: Readonly<Record<string, string | undefined>>;
    }) => Response | Promise<Response>
  )({ params: { year: String(year) } });

const affectedLinks = (document: ReturnType<typeof parseHtml>) =>
  [...document.querySelectorAll('[data-status-calendar-day-link]')].map(
    (link) => ({
      id: link.getAttribute('data-status-calendar-day-link') ?? undefined,
      href: link.getAttribute('href'),
      marker: link.getAttribute('data-status-calendar-marker') ?? undefined,
      label: link.getAttribute('aria-label'),
      hasDescription: link.hasAttribute('aria-describedby'),
    }),
  );

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DEFAULT_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('/status/calendar/YYYY/', () => {
  it('shares one build-year snapshot between HTML and Markdown routes', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:59:00+03:00'));

    try {
      const htmlPaths = await StatusCalendarYearPage.getStaticPaths();

      vi.setSystemTime(new Date('2027-01-01T00:01:00+03:00'));

      const markdownPaths =
        await StatusCalendarYearMarkdownRoute.getStaticPaths();

      expect({
        htmlYears: htmlPaths.map(({ params }) => params.year),
        markdownYears: markdownPaths.map(({ params }) => params.year),
      }).toMatchInlineSnapshot(`
        {
          "htmlYears": [
            "2026",
            "2027",
          ],
          "markdownYears": [
            "2026",
            "2027",
          ],
        }
      `);
    } finally {
      vi.setSystemTime(DEFAULT_NOW);
    }
  });

  it('keeps completed calendar years after a Moscow New Year deployment', async () => {
    fixtures.data.calendar.buildYear = 2027;

    try {
      const [htmlPaths, markdownPaths] = await Promise.all([
        StatusCalendarYearPage.getStaticPaths(),
        StatusCalendarYearMarkdownRoute.getStaticPaths(),
      ]);

      expect({ htmlPaths, markdownPaths }).toMatchInlineSnapshot(`
        {
          "htmlPaths": [
            {
              "params": {
                "year": "2026",
              },
            },
            {
              "params": {
                "year": "2027",
              },
            },
            {
              "params": {
                "year": "2028",
              },
            },
          ],
          "markdownPaths": [
            {
              "params": {
                "year": "2026",
              },
            },
            {
              "params": {
                "year": "2027",
              },
            },
            {
              "params": {
                "year": "2028",
              },
            },
          ],
        }
      `);
    } finally {
      fixtures.data.calendar.buildYear = 2026;
    }
  });

  it('renders every path from one static year snapshot across Moscow New Year', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:59:00+03:00'));
    const oldYear = Number(
      (await StatusCalendarYearPage.getStaticPaths())[0]?.params.year,
    );

    try {
      vi.setSystemTime(new Date('2027-01-01T00:01:00+03:00'));
      const [html, markdownResponse] = await Promise.all([
        renderPage(oldYear),
        renderMarkdownRoute(oldYear),
      ]);

      expect({
        oldYear,
        htmlYear: parseHtml(html)
          .querySelector('[data-status-calendar-year]')
          ?.getAttribute('data-status-calendar-year'),
        markdownStatus: markdownResponse.status,
      }).toMatchInlineSnapshot(`
        {
          "htmlYear": "2026",
          "markdownStatus": 200,
          "oldYear": 2026,
        }
      `);
    } finally {
      vi.setSystemTime(DEFAULT_NOW);
    }
  });

  it('creates the current and upcoming Moscow years for HTML and Markdown', async () => {
    const [htmlPaths, markdownPaths, upcomingHtml] = await Promise.all([
      StatusCalendarYearPage.getStaticPaths(),
      StatusCalendarYearMarkdownRoute.getStaticPaths(),
      renderPage(2027),
    ]);
    const upcomingDocument = parseHtml(upcomingHtml);

    expect({
      htmlPaths,
      markdownPaths,
      upcomingYear: upcomingDocument
        .querySelector('[data-status-calendar-year]')
        ?.getAttribute('data-status-calendar-year'),
      upcomingNewYearDate: Boolean(
        upcomingDocument.querySelector(
          '[data-status-calendar-date="2027-01-01"]',
        ),
      ),
    }).toMatchInlineSnapshot(`
      {
        "htmlPaths": [
          {
            "params": {
              "year": "2026",
            },
          },
          {
            "params": {
              "year": "2027",
            },
          },
        ],
        "markdownPaths": [
          {
            "params": {
              "year": "2026",
            },
          },
          {
            "params": {
              "year": "2027",
            },
          },
        ],
        "upcomingNewYearDate": true,
        "upcomingYear": "2027",
      }
    `);
  });

  it('renders a Monday-first 12-month matrix with decorative adjacent dates', async () => {
    const document = parseHtml(await renderPage());
    const months = [
      ...document.querySelectorAll('[data-status-calendar-month]'),
    ];
    const january = months[0];
    const adjacent = january?.querySelector(
      '[data-status-calendar-adjacent="2025-12-29"]',
    );

    expect({
      monthCount: months.length,
      cellsPerMonth: months.map(
        (month) => month.querySelectorAll('[data-status-calendar-cell]').length,
      ),
      januaryWeekdays: [...(january?.querySelectorAll('th') ?? [])].map(
        (heading) => ({
          label: heading.getAttribute('aria-label'),
          text: cleanText(heading.textContent),
        }),
      ),
      adjacent: {
        text: cleanText(adjacent?.textContent ?? ''),
        ariaHidden: adjacent?.getAttribute('aria-hidden'),
        hasLink: Boolean(adjacent?.querySelector('a')),
        hasMarker: Boolean(
          adjacent?.querySelector('[data-status-calendar-marker]'),
        ),
        hasTooltip: Boolean(adjacent?.querySelector('[role="tooltip"]')),
        hasTitle: Boolean(adjacent?.querySelector('[title]')),
      },
      unaffectedDayHasLink: Boolean(
        january?.querySelector('[data-status-calendar-cell="2026-01-02"] a'),
      ),
      clientDateCount: document.querySelectorAll('[data-status-calendar-date]')
        .length,
      hasBuildTimeToday: Boolean(
        document.querySelector(
          '[data-status-calendar-today], [aria-current="date"]',
        ),
      ),
    }).toMatchInlineSnapshot(`
      {
        "adjacent": {
          "ariaHidden": "true",
          "hasLink": false,
          "hasMarker": false,
          "hasTitle": false,
          "hasTooltip": false,
          "text": "29",
        },
        "cellsPerMonth": [
          42,
          42,
          42,
          42,
          42,
          42,
          42,
          42,
          42,
          42,
          42,
          42,
        ],
        "clientDateCount": 365,
        "hasBuildTimeToday": false,
        "januaryWeekdays": [
          {
            "label": "Понедельник",
            "text": "Пн",
          },
          {
            "label": "Вторник",
            "text": "Вт",
          },
          {
            "label": "Среда",
            "text": "Ср",
          },
          {
            "label": "Четверг",
            "text": "Чт",
          },
          {
            "label": "Пятница",
            "text": "Пт",
          },
          {
            "label": "Суббота",
            "text": "Сб",
          },
          {
            "label": "Воскресенье",
            "text": "Вс",
          },
        ],
        "monthCount": 12,
        "unaffectedDayHasLink": false,
      }
    `);
  });

  it('links only affected days with markers, tooltips, and full labels', async () => {
    const document = parseHtml(await renderPage());
    const links = affectedLinks(document);
    const targetsExist = links.map((link) => {
      const target = new URL(link.href ?? '', 'https://example.com');
      const monthMatch = target.pathname.match(/\/(\d{4})\/(\d{2})\/$/u);
      const monthId = monthMatch
        ? `${monthMatch[1]}/${monthMatch[2]}`
        : undefined;

      return {
        id: link.id,
        monthExists: monthId
          ? fixtures.data.calendar.byMonth.has(monthId)
          : false,
        anchorExists: fixtures.data.calendar.byDay.has(target.hash.slice(1)),
      };
    });

    expect({
      links,
      targetsExist,
      tooltips: [
        ...document.querySelectorAll('[data-status-calendar-tooltip]'),
      ].map((tooltip) => ({
        role: tooltip.getAttribute('role'),
        lines: [...tooltip.querySelectorAll(':scope > span')].map((line) =>
          visibleWhitespace(line.textContent.trim()),
        ),
      })),
    }).toMatchInlineSnapshot(`
      {
        "links": [
          {
            "hasDescription": false,
            "href": "/status/calendar/2026/01/#2026-01-01",
            "id": "2026-01-01",
            "label": "1 января 2026: 1 плановая работа",
            "marker": "maintenance",
          },
          {
            "hasDescription": false,
            "href": "/status/calendar/2026/08/#2026-08-23",
            "id": "2026-08-23",
            "label": "23 августа 2026: 1 проблема",
            "marker": "incident",
          },
          {
            "hasDescription": false,
            "href": "/status/calendar/2026/08/#2026-08-24",
            "id": "2026-08-24",
            "label": "24 августа 2026: 2 проблемы, 1 плановая работа",
            "marker": "mixed",
          },
        ],
        "targetsExist": [
          {
            "anchorExists": true,
            "id": "2026-01-01",
            "monthExists": true,
          },
          {
            "anchorExists": true,
            "id": "2026-08-23",
            "monthExists": true,
          },
          {
            "anchorExists": true,
            "id": "2026-08-24",
            "monthExists": true,
          },
        ],
        "tooltips": [
          {
            "lines": [
              "1 плановая работа",
            ],
            "role": "tooltip",
          },
          {
            "lines": [
              "1 проблема",
            ],
            "role": "tooltip",
          },
          {
            "lines": [
              "2 проблемы",
              "1 плановая работа",
            ],
            "role": "tooltip",
          },
        ],
      }
    `);
  });

  it('shows the compact legend and keeps the dark launch out of search surfaces', async () => {
    const document = parseHtml(await renderPage());
    const legend = document.querySelector('[data-status-calendar-legend]');

    expect({
      legendItemCount: legend?.querySelectorAll('li').length,
      legendMarkers: [
        ...(legend?.querySelectorAll('[data-status-calendar-marker]') ?? []),
      ].map((marker) => marker.getAttribute('data-status-calendar-marker')),
      todayLegend: Boolean(
        legend?.querySelector('[data-status-calendar-today-legend]'),
      ),
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
        "legendItemCount": 2,
        "legendMarkers": [
          "incident",
          "maintenance",
        ],
        "metadata": {
          "markdownAlternate": undefined,
          "pagefindRoot": undefined,
          "robots": "noindex, nofollow",
        },
        "todayLegend": false,
      }
    `);
  });

  it('keeps affected dates and targets aligned in HTML and Markdown', async () => {
    const [html, markdownResponse] = await Promise.all([
      renderPage(),
      renderMarkdownRoute(),
    ]);
    const htmlLinks = affectedLinks(parseHtml(html)).map((link) => ({
      href: new URL(link.href ?? '', 'https://kpshelkovo.online').toString(),
      label: link.label,
    }));
    const markdown = await markdownResponse.text();
    const markdownLinks = [
      ...markdown.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)$/gmu),
    ].map(([, label, href]) => ({ href, label }));
    const headingCount = [...markdown.matchAll(/^## .+$/gmu)].length;

    expect(markdownLinks).toEqual(htmlLinks);
    expect({
      headingCount,
      contentType: markdownResponse.headers.get('Content-Type'),
      robots: markdownResponse.headers.get('X-Robots-Tag'),
      hasMarkdownTable: /^\|/mu.test(markdown),
    }).toMatchInlineSnapshot(`
      {
        "contentType": "text/markdown; charset=utf-8",
        "hasMarkdownTable": false,
        "headingCount": 12,
        "robots": "noindex, follow",
      }
    `);
  });
});
