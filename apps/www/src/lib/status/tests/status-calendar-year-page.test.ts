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
    (link) => {
      const describedBy = link.getAttribute('aria-describedby') ?? undefined;

      return {
        id: link.getAttribute('data-status-calendar-day-link') ?? undefined,
        href: link.getAttribute('href'),
        marker: link.getAttribute('data-status-calendar-marker') ?? undefined,
        label: link.getAttribute('aria-label'),
        describedBy,
        description: describedBy
          ? document.getElementById(describedBy)?.getAttribute('aria-label')
          : undefined,
        descriptionExists: describedBy
          ? Boolean(document.getElementById(describedBy))
          : false,
      };
    },
  );

const staticPathYears = (
  paths: readonly {
    readonly params: Readonly<Record<string, string | undefined>>;
  }[],
): readonly (string | undefined)[] => paths.map((path) => path.params.year);

const yearNavigation = (document: ReturnType<typeof parseHtml>) =>
  ['previous', 'next'].map((direction) => {
    const control = document.querySelector(
      `[data-status-calendar-${direction}]`,
    );

    return {
      direction,
      tag: control?.tagName,
      href: control?.getAttribute('href') ?? undefined,
      disabled: control?.hasAttribute('disabled'),
      label: control?.getAttribute('aria-label'),
      text: cleanText(control?.textContent ?? ''),
    };
  });

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DEFAULT_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('/status/calendar/YYYY/', () => {
  it('renders an empty current year as a regular single-year calendar', async () => {
    const originalYears = fixtures.data.calendar.years;
    const originalByDay = fixtures.data.calendar.byDay;
    fixtures.data.calendar.years = [];
    fixtures.data.calendar.byDay = new Map();

    try {
      const [htmlPaths, markdownPaths, html] = await Promise.all([
        StatusCalendarYearPage.getStaticPaths(),
        StatusCalendarYearMarkdownRoute.getStaticPaths(),
        renderPage(),
      ]);
      const document = parseHtml(html);

      expect({
        htmlYears: staticPathYears(htmlPaths),
        markdownYears: staticPathYears(markdownPaths),
        monthCount: document.querySelectorAll('[data-status-calendar-month]')
          .length,
        hasEmptyState: cleanText(document.body.textContent).includes(
          'Нет записей',
        ),
        navigation: yearNavigation(document),
      }).toMatchInlineSnapshot(`
        {
          "hasEmptyState": false,
          "htmlYears": [
            "2026",
          ],
          "markdownYears": [
            "2026",
          ],
          "monthCount": 12,
          "navigation": [
            {
              "direction": "previous",
              "disabled": true,
              "href": undefined,
              "label": "Нет данных за предыдущий год",
              "tag": "BUTTON",
              "text": "←",
            },
            {
              "direction": "next",
              "disabled": true,
              "href": undefined,
              "label": "Нет данных за следующий год",
              "tag": "BUTTON",
              "text": "→",
            },
          ],
        }
      `);
    } finally {
      fixtures.data.calendar.years = originalYears;
      fixtures.data.calendar.byDay = originalByDay;
    }
  });

  it('jumps year gaps and only links matching HTML and Markdown targets', async () => {
    const originalYears = fixtures.data.calendar.years;
    fixtures.data.calendar.years = [
      { year: 2028, months: [] },
      ...originalYears,
      { year: 2022, months: [] },
    ];

    try {
      const [htmlPaths, markdownPaths, currentHtml, firstHtml, lastHtml] =
        await Promise.all([
          StatusCalendarYearPage.getStaticPaths(),
          StatusCalendarYearMarkdownRoute.getStaticPaths(),
          renderPage(2026),
          renderPage(2022),
          renderPage(2028),
        ]);
      const htmlYears = staticPathYears(htmlPaths);
      const markdownYears = staticPathYears(markdownPaths);
      const currentDocument = parseHtml(currentHtml);
      const linkedYears = [
        ...currentDocument.querySelectorAll(
          '[data-status-calendar-year-navigation] a[href]',
        ),
      ].map((link) => link.getAttribute('href')?.match(/\/(\d{4})\/$/u)?.[1]);

      expect({
        htmlYears,
        markdownYears,
        current: yearNavigation(currentDocument),
        first: yearNavigation(parseHtml(firstHtml)),
        last: yearNavigation(parseHtml(lastHtml)),
        linkedTargetsExist: linkedYears.map((year) => ({
          year,
          html: htmlYears.includes(year),
          markdown: markdownYears.includes(year),
        })),
      }).toMatchInlineSnapshot(`
        {
          "current": [
            {
              "direction": "previous",
              "disabled": false,
              "href": "/status/calendar/2022/",
              "label": "Календарь за 2022 год",
              "tag": "A",
              "text": "←2022",
            },
            {
              "direction": "next",
              "disabled": false,
              "href": "/status/calendar/2028/",
              "label": "Календарь за 2028 год",
              "tag": "A",
              "text": "2028→",
            },
          ],
          "first": [
            {
              "direction": "previous",
              "disabled": true,
              "href": undefined,
              "label": "Нет данных за предыдущий год",
              "tag": "BUTTON",
              "text": "←",
            },
            {
              "direction": "next",
              "disabled": false,
              "href": "/status/calendar/2026/",
              "label": "Календарь за 2026 год",
              "tag": "A",
              "text": "2026→",
            },
          ],
          "htmlYears": [
            "2022",
            "2026",
            "2028",
          ],
          "last": [
            {
              "direction": "previous",
              "disabled": false,
              "href": "/status/calendar/2026/",
              "label": "Календарь за 2026 год",
              "tag": "A",
              "text": "←2026",
            },
            {
              "direction": "next",
              "disabled": true,
              "href": undefined,
              "label": "Нет данных за следующий год",
              "tag": "BUTTON",
              "text": "→",
            },
          ],
          "linkedTargetsExist": [
            {
              "html": true,
              "markdown": true,
              "year": "2022",
            },
            {
              "html": true,
              "markdown": true,
              "year": "2028",
            },
          ],
          "markdownYears": [
            "2022",
            "2026",
            "2028",
          ],
        }
      `);
    } finally {
      fixtures.data.calendar.years = originalYears;
    }
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
        id: tooltip.id,
        role: tooltip.getAttribute('role'),
        label: tooltip.getAttribute('aria-label'),
        ariaHidden: tooltip.getAttribute('aria-hidden'),
        text: visibleWhitespace(
          tooltip
            .querySelector('[data-status-calendar-tooltip-text]')
            ?.textContent.trim() ?? '',
        ),
        interactiveElements: tooltip.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]',
        ).length,
      })),
    }).toMatchInlineSnapshot(`
      {
        "links": [
          {
            "describedBy": "status-calendar-tooltip-2026-01-01",
            "description": "1 плановая работа",
            "descriptionExists": true,
            "href": "/status/calendar/2026/01/#2026-01-01",
            "id": "2026-01-01",
            "label": "1 января 2026",
            "marker": "maintenance",
          },
          {
            "describedBy": "status-calendar-tooltip-2026-08-23",
            "description": "1 проблема",
            "descriptionExists": true,
            "href": "/status/calendar/2026/08/#2026-08-23",
            "id": "2026-08-23",
            "label": "23 августа 2026",
            "marker": "incident",
          },
          {
            "describedBy": "status-calendar-tooltip-2026-08-24",
            "description": "2 проблемы, 1 плановая работа",
            "descriptionExists": true,
            "href": "/status/calendar/2026/08/#2026-08-24",
            "id": "2026-08-24",
            "label": "24 августа 2026",
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
            "ariaHidden": "true",
            "id": "status-calendar-tooltip-2026-01-01",
            "interactiveElements": 0,
            "label": "1 плановая работа",
            "role": "tooltip",
            "text": "1·января·2026: 1·плановая·работа",
          },
          {
            "ariaHidden": "true",
            "id": "status-calendar-tooltip-2026-08-23",
            "interactiveElements": 0,
            "label": "1 проблема",
            "role": "tooltip",
            "text": "23·августа·2026: 1·проблема",
          },
          {
            "ariaHidden": "true",
            "id": "status-calendar-tooltip-2026-08-24",
            "interactiveElements": 0,
            "label": "2 проблемы, 1 плановая работа",
            "role": "tooltip",
            "text": "24·августа·2026: 2·проблемы, 1·плановая·работа",
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
      label: link.description
        ? `${link.label}: ${link.description}`
        : link.label,
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
