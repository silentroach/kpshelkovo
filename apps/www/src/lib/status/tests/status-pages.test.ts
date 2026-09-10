/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { loadStatusData } from '@/lib/status/load';
import { statusCalendarYearUrl, statusHistoryUrl } from '@/lib/status/routes';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusServicePage from '@/pages/status/[service]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusHistoryPage from '@/pages/status/history/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusIncidentPage from '@/pages/status/incidents/[year]/[month]/[entry]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusPage from '@/pages/status/index.astro';
import { createAstroContainer } from '@/test/astro-container';

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
        hasTime: true
      },
      ended: {
        at: new Date(`2026-08-${String(number).padStart(2, '0')}T10:00:00Z`),
        iso: `2026-08-${String(number).padStart(2, '0')}T13:00:00+03:00`,
        hasTime: true
      },
      phase: 'resolved',
      appliesToAllAreas: true,
      areas: [],
      body: '',
      mentions: [],
      sortStartedAt: number,
      sortLastChangeAt: number
    };

    return index % 2 === 0
      ? {
          ...base,
          hasPage: false as const
        }
      : {
          ...base,
          hasPage: true as const,
          url: `/status/incidents/2026/08/${slug}/`,
          markdownUrl: `/status/incidents/2026/08/${slug}/index.md`,
          canonical: `https://example.com/status/incidents/2026/08/${slug}/`
        };
  });
  const maintenanceStarted = new Date('2026-08-20T10:00:00+03:00');
  const scheduledMaintenance = {
    id: '2026/08/dam-maintenance',
    title: 'Плановые работы на дамбе',
    service: 'dam' as const,
    kind: 'maintenance' as const,
    year: 2026,
    month: 8,
    slug: 'dam-maintenance',
    started: {
      at: maintenanceStarted,
      iso: '2026-08-20T10:00:00+03:00',
      hasTime: true
    },
    phase: 'scheduled' as const,
    appliesToAllAreas: true,
    areas: [],
    body: '',
    mentions: [],
    sortStartedAt: maintenanceStarted.valueOf(),
    sortLastChangeAt: maintenanceStarted.valueOf(),
    hasPage: false as const
  };
  const allIncidents = [scheduledMaintenance, ...incidents];
  const service = {
    service: 'electricity' as const,
    serviceStatus: 'green' as const,
    incidents,
    activeIncidents: [],
    activeMaintenance: [],
    daysWithoutIncidents: { mode: 'noIncidents' as const }
  };

  return {
    data: {
      incidents: allIncidents,
      active: [],
      services: [service],
      calendar: {
        buildYear: 2026
      },
      byId: new Map(),
      byService: new Map([['electricity', service]])
    },
    scheduledMaintenance
  };
});

vi.mock('@/lib/status/load', () => ({
  loadStatusData: async () => fixtures.data,
  loadStatusService: async () => fixtures.data.services[0],
  loadStatusIncidentDetail: async (id: string) =>
    fixtures.data.incidents.find((incident) => incident.id === id)
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
    ([, level, content]) => `h${level}: ${stripTags(content)}`
  );

const parseHtml = (html: string) => {
  const document = new Window().document;
  document.write(html);

  return document;
};

const expectItemListMatchesHistory = (
  document: ReturnType<typeof parseHtml>
): readonly Record<string, unknown>[] => {
  const titles = [...document.querySelectorAll('[data-status-history] article h3')].map((heading) =>
    heading.textContent.replace(/\s+/gu, ' ').trim()
  );
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => JSON.parse(script.textContent) as Record<string, unknown>
  );
  const itemList = schemas.find((schema) => schema['@type'] === 'ItemList');

  if (!itemList || !Array.isArray(itemList.itemListElement)) {
    throw new Error('Status page must include an ItemList schema');
  }

  const items = itemList.itemListElement as readonly Record<string, unknown>[];

  expect(itemList.numberOfItems).toBe(titles.length);
  expect(items).toHaveLength(titles.length);
  expect(items.map((item) => item.name)).toEqual(titles);
  expect(items.map((item) => item.position)).toEqual(titles.map((_, index) => index + 1));

  return items;
};

describe('/status/', () => {
  it.each([
    { page: StatusPage, path: '/status/', params: {} },
    { page: StatusServicePage, path: '/status/electricity/', params: { service: 'electricity' } }
  ])('indexes $path without its visible history', async ({ page, path, params }) => {
    const container = await createAstroContainer();
    const document = parseHtml(
      await container.renderToString(page, {
        params,
        request: new Request(`https://kpshelkovo.online${path}`)
      })
    );
    const indexedText = [...document.querySelectorAll('[data-pagefind-body]')]
      .map((element) => element.textContent)
      .join(' ');

    expect(Boolean(document.querySelector('[data-pagefind-root]'))).toBe(true);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBeUndefined();
    expect(indexedText).toContain('Шелково');
    expect(indexedText).not.toContain('Тестовая запись');
    expect(document.querySelector('main')?.textContent).toContain('Тестовая запись');
  });

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

    expect(history?.querySelectorAll('article')).toHaveLength(Math.min(10, data.incidents.length));
    expect(history?.querySelector(`a[href="${statusHistoryUrl()}"]`)).not.toBeNull();
    expectItemListMatchesHistory(document);
  });

  it('keeps snapshot-scheduled maintenance at the start boundary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixtures.scheduledMaintenance.started.at);

    try {
      const container = await createAstroContainer();
      const document = parseHtml(await container.renderToString(StatusPage));
      const heading = [...document.querySelectorAll('h2')].find(
        (item) => item.textContent.trim() === 'Плановые работы'
      );

      expect(heading?.closest('section')?.textContent).toContain(
        fixtures.scheduledMaintenance.title
      );
    } finally {
      vi.useRealTimers();
    }
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
      title: link?.getAttribute('title')
    }).toMatchInlineSnapshot(`
      {
        "accessibleName": "Проблемы и плановые работы за 2026 год",
        "decorativeIcon": "true",
        "href": "/status/calendar/2026/",
        "title": "Проблемы и плановые работы за 2026 год",
      }
    `);
    expect(link?.getAttribute('href')).toBe(
      statusCalendarYearUrl({ year: data.calendar.buildYear })
    );
  });

  it('keeps the overview service state on the shared hydration contract', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);
    const document = parseHtml(html);
    const state = document.querySelector(
      '[data-status-service-card] [data-status-service-state-label]'
    );
    if (!state) {
      throw new Error('Overview service state is missing');
    }

    const windows = JSON.parse(
      state.getAttribute('data-status-service-incidents') ?? '[]'
    ) as readonly unknown[];

    expect({
      hasLifecyclePayload: windows.length > 0,
      role: state.getAttribute('role'),
      state: state.getAttribute('data-status-service-state')
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

    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, follow'
    );
    expect(Boolean(document.querySelector('[data-pagefind-root]'))).toBe(false);
    expect(document.querySelectorAll('[data-status-history] article')).toHaveLength(
      data.incidents.length
    );

    const schemaItems = expectItemListMatchesHistory(document);
    const listOnlyIndexes = data.incidents.flatMap((incident, index) =>
      incident.hasPage ? [] : [index]
    );

    expect(listOnlyIndexes.length).toBeGreaterThan(0);
    for (const index of listOnlyIndexes) {
      expect(schemaItems[index]).not.toHaveProperty('item');
    }
  });

  it('links the calendar view for the current Moscow year', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const document = parseHtml(await container.renderToString(StatusHistoryPage));

    expect(document.querySelector('[data-status-history-calendar]')?.getAttribute('href')).toBe(
      statusCalendarYearUrl({ year: data.calendar.buildYear })
    );
  });
});

describe('/status/incidents/[year]/[month]/[entry]/', () => {
  it.each([
    ['2026-07-01T00:00:00Z', true],
    ['2026-08-02T09:30:00Z', true],
    ['2026-09-01T10:00:00Z', true],
    ['2026-09-01T10:00:00.001Z', false]
  ] as const)(
    'keeps external noindex while choosing the internal corpus at %s',
    async (now, included) => {
      vi.useFakeTimers();
      vi.setSystemTime(now);

      try {
        const container = await createAstroContainer();
        const path = '/status/incidents/2026/08/incident-2/';
        const document = parseHtml(
          await container.renderToString(StatusIncidentPage, {
            params: { year: '2026', month: '08', entry: 'incident-2' },
            request: new Request(`https://kpshelkovo.online${path}`)
          })
        );

        expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
          'noindex, follow'
        );
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
          `https://kpshelkovo.online${path}`
        );
        expect(Boolean(document.querySelector('[data-pagefind-root]'))).toBe(included);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('adds the incident date to the document title only', async () => {
    const incident = fixtures.data.incidents.find((item) => item.hasPage);
    if (!incident?.hasPage) {
      throw new Error('status incident detail fixture is missing');
    }

    const container = await createAstroContainer();
    const document = parseHtml(
      await container.renderToString(StatusIncidentPage, {
        params: {
          year: String(incident.year),
          month: String(incident.month).padStart(2, '0'),
          entry: incident.slug
        },
        request: new Request(incident.canonical)
      })
    );

    expect({
      documentTitle: document.title,
      heading: document.querySelector('h1')?.textContent.trim()
    }).toMatchInlineSnapshot(`
      {
        "documentTitle": "Тестовая запись 2, 2 августа 2026 — Шелково Онлайн",
        "heading": "Тестовая запись 2",
      }
    `);
  });
});
