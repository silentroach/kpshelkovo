/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { loadStatusData } from '@/lib/status/load';
import { statusCalendarYearUrl, statusHistoryUrl } from '@/lib/status/routes';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusPage from '@/pages/status/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusHistoryPage from '@/pages/status/history/index.astro';

const fixtures = vi.hoisted(() => {
  const incidents = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const slug = `incident-${number}`;
    const base = {
      id: `2026/08/${slug}`,
      title: `Тестовая запись ${number}`,
      service: 'electricity' as const,
      kind: 'incident' as const,
      year: 2026,
      month: 8,
      slug,
      started: {
        at: new Date(`2026-08-${String(number).padStart(2, '0')}T09:00:00Z`),
        iso: `2026-08-${String(number).padStart(2, '0')}T12:00:00+03:00`,
        hasTime: true,
      },
      phase: 'resolved',
      appliesToAllAreas: true,
      areas: [],
      body: '',
      mentions: [],
      sortStartedAt: number,
      sortLastChangeAt: number,
    };

    return index % 2 === 0
      ? {
          ...base,
          hasPage: false as const,
        }
      : {
          ...base,
          hasPage: true as const,
          url: `/status/incidents/2026/08/${slug}/`,
          markdownUrl: `/status/incidents/2026/08/${slug}/index.md`,
          canonical: `https://example.com/status/incidents/2026/08/${slug}/`,
        };
  });
  const service = {
    service: 'electricity' as const,
    serviceStatus: 'green' as const,
    incidents,
    activeIncidents: [],
    activeMaintenance: [],
    daysWithoutIncidents: { mode: 'noIncidents' as const },
  };

  return {
    data: {
      incidents,
      active: [],
      services: [service],
      calendar: {
        buildYear: 2026,
      },
      byId: new Map(),
      byService: new Map([['electricity', service]]),
    },
  };
});

vi.mock('@/lib/status/load', () => ({
  loadStatusData: async () => fixtures.data,
}));

const stripTags = (value: string): string => {
  let sanitized = value;
  let previous: string;

  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/gu, '');
  } while (sanitized !== previous);

  return sanitized.replace(/\s+/gu, ' ').trim();
};

const headingOutline = (html: string): readonly string[] =>
  [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gu)].map(
    ([, level, content]) => `h${level}: ${stripTags(content)}`,
  );

const parseHtml = (html: string) => {
  const document = new Window().document;
  document.write(html);

  return document;
};

const expectItemListMatchesHistory = (
  document: ReturnType<typeof parseHtml>,
): readonly Record<string, unknown>[] => {
  const titles = [
    ...document.querySelectorAll('[data-status-history] article h3'),
  ].map((heading) => heading.textContent.replace(/\s+/gu, ' ').trim());
  const schemas = [
    ...document.querySelectorAll('script[type="application/ld+json"]'),
  ].map((script) => JSON.parse(script.textContent) as Record<string, unknown>);
  const itemList = schemas.find((schema) => schema['@type'] === 'ItemList');

  if (!itemList || !Array.isArray(itemList.itemListElement)) {
    throw new Error('Status page must include an ItemList schema');
  }

  const items = itemList.itemListElement as readonly Record<string, unknown>[];

  expect(itemList.numberOfItems).toBe(titles.length);
  expect(items).toHaveLength(titles.length);
  expect(items.map((item) => item.name)).toEqual(titles);
  expect(items.map((item) => item.position)).toEqual(
    titles.map((_, index) => index + 1),
  );

  return items;
};

describe('/status/', () => {
  it('keeps the service overview heading outline sequential', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);

    expect(headingOutline(html).slice(0, 3)).toMatchInlineSnapshot(`
      [
        "h1: Статус КП Шелково",
        "h2: Сводка по сервисам",
        "h3: Электричество",
      ]
    `);
  });

  it('keeps recent history bounded and links to the full archive', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);
    const document = parseHtml(html);
    const history = document.querySelector('[data-status-history]');

    expect(history?.querySelectorAll('article')).toHaveLength(
      Math.min(10, data.incidents.length),
    );
    expect(
      history?.querySelector(`a[href="${statusHistoryUrl()}"]`),
    ).not.toBeNull();
    expectItemListMatchesHistory(document);
  });

  it('links the current Moscow year calendar from the page header', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const document = parseHtml(await container.renderToString(StatusPage));
    const link = document.querySelector('[data-status-calendar-entry]');

    expect({
      accessibleName: link?.getAttribute('aria-label'),
      href: link?.getAttribute('href'),
      decorativeIcon: link?.querySelector('svg')?.getAttribute('aria-hidden'),
      title: link?.getAttribute('title'),
    }).toMatchInlineSnapshot(`
      {
        "accessibleName": "Проблемы и плановые работы за 2026 год",
        "decorativeIcon": "true",
        "href": "/status/calendar/2026/",
        "title": "Проблемы и плановые работы за 2026 год",
      }
    `);
    expect(link?.getAttribute('href')).toBe(
      statusCalendarYearUrl({ year: data.calendar.buildYear }),
    );
  });

  it('keeps the overview service state on the shared hydration contract', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);
    const document = parseHtml(html);
    const state = document.querySelector(
      '[data-status-service-card] [data-status-service-state-label]',
    );
    if (!state) {
      throw new Error('Overview service state is missing');
    }

    const windows = JSON.parse(
      state.getAttribute('data-status-service-incidents') ?? '[]',
    ) as readonly unknown[];

    expect({
      hasLifecyclePayload: windows.length > 0,
      role: state.getAttribute('role'),
      state: state.getAttribute('data-status-service-state'),
    }).toMatchInlineSnapshot(`
      {
        "hasLifecyclePayload": true,
        "role": "status",
        "state": "green",
      }
    `);
  });
});

describe('/status/history/', () => {
  it('renders every incident without client-side loading', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusHistoryPage);
    const document = parseHtml(html);

    expect(
      document.querySelectorAll('[data-status-history] article'),
    ).toHaveLength(data.incidents.length);

    const schemaItems = expectItemListMatchesHistory(document);
    const listOnlyIndexes = data.incidents.flatMap((incident, index) =>
      incident.hasPage ? [] : [index],
    );

    expect(listOnlyIndexes.length).toBeGreaterThan(0);
    for (const index of listOnlyIndexes) {
      expect(schemaItems[index]).not.toHaveProperty('item');
    }
  });

  it('links the calendar view for the current Moscow year', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const document = parseHtml(
      await container.renderToString(StatusHistoryPage),
    );

    expect(
      document
        .querySelector('[data-status-history-calendar]')
        ?.getAttribute('href'),
    ).toBe(statusCalendarYearUrl({ year: data.calendar.buildYear }));
  });
});
