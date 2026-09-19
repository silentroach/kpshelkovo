/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildEventCalendar } from '@/lib/events/calendar-projection';
import { mapRawEvent } from '@/lib/events/mapper';
import { RawEventSchema } from '@/lib/events/raw-schema';
import type { RawEventInput } from '@/lib/events/raw-schema';
import { buildEventMonthCells, formatEventRange } from '@/lib/events/view';
// @ts-expect-error Astro components are resolved by Astro/Vitest.
import EventEntryPage from '@/pages/events/[year]/[month]/[entry].astro';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro components are resolved by Astro/Vitest.
import EventCard from '../EventCard.astro';
// @ts-expect-error Astro components are resolved by Astro/Vitest.
import EventMonthPage from '../EventMonthPage.astro';

const event = (id: string, starts: string, extra: Partial<RawEventInput> = {}) =>
  mapRawEvent({
    id,
    body: '[Записаться](https://example.com/register). Примерная длительность: четыре часа.',
    data: RawEventSchema.parse({
      title: id,
      slug: `${id}-detail`,
      category: 'workshops',
      starts_at: starts,
      source_url: 'https://example.com/source',
      ...extra
    })
  });

const documentFor = (html: string) => {
  const window = new Window();
  window.document.write(html);
  return window.document;
};

describe('event cards', () => {
  it('preserves unknown time/place, price options, registration and a single source', async () => {
    const container = await createAstroContainer();
    const record = event('unknown', '2026-09-19', {
      price: '600, 800 или 1000 рублей в зависимости от изделия',
      audience: 'От 6 лет',
      status: 'conditional'
    });
    const document = documentFor(
      await container.renderToString(EventCard, { props: { event: record } })
    );
    const text = document.body.textContent.replaceAll('\u00a0', ' ');
    expect(text).toContain('время не указано');
    expect(text).toContain('Место уточняется');
    expect(text).toContain(record.price);
    expect(text).toContain(record.audience);
    expect(document.querySelector('[data-status="conditional"]')).toBeTruthy();
    const facts = [...document.querySelectorAll('dd')].map((item) =>
      item.textContent.replaceAll('\u00a0', ' ')
    );
    expect(facts).toContain(record.price);
    expect(facts).toContain(record.audience);
    expect(document.querySelectorAll('a[href="https://example.com/source"]')).toHaveLength(1);
    expect(document.querySelector('a[href="https://example.com/register"]')).toBeTruthy();
    expect(document.querySelector('iframe, map-preview, a[download]')).toBeFalsy();
    expect(text).not.toMatch(/00:00|Бесплатно|состоялось/);
  });

  it('keeps a cancelled card and map but hides the calendar download', async () => {
    const container = await createAstroContainer();
    const record = event('cancelled', '19.09.2026 17:00', {
      status: 'cancelled',
      location: 'Внешняя площадка',
      coordinates: { lat: 54.8, lng: 37.9 }
    });
    const document = documentFor(
      await container.renderToString(EventEntryPage, {
        props: { event: record, month: buildEventCalendar([record]).months[0]! },
        request: new Request(`https://kpshelkovo.online${record.url}`)
      })
    );
    expect(document.querySelector('article#cancelled [data-status="cancelled"]')).toBeTruthy();
    expect(document.querySelector('h1')?.textContent.replaceAll('\u00a0', ' ')).toBe(
      `Отменено: ${record.title}`
    );
    expect(document.querySelectorAll('[data-status="cancelled"]')).toHaveLength(1);
    expect(document.querySelector('[data-search-title]')?.getAttribute('data-search-title')).toBe(
      `Отменено: ${record.title} — События`
    );
    expect(document.querySelector('aside h2')?.textContent).toBe(record.location);
    expect(document.querySelector('a[download]')).toBeFalsy();
    expect(document.querySelector('map-preview')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeFalsy();
    expect(document.querySelector('a[href*="pt=37.9,54.8"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('19:00');
  });

  it('offers eligible ICS without displaying the export-only two-hour end', async () => {
    const container = await createAstroContainer();
    const record = event('timed', '19.09.2026 17:00');
    const document = documentFor(
      await container.renderToString(EventCard, { props: { event: record } })
    );
    expect(document.querySelector('a[download]')?.getAttribute('href')).toBe(record.icsUrl);
    expect(
      document
        .querySelector('a[download]')
        ?.parentElement?.querySelector('time')
        ?.getAttribute('datetime')
    ).toBe(record.startsIso);
    expect(document.body.textContent).not.toContain('19:00');
  });

  it('renders one location card only when a name or coordinates exist, keeping a map fallback', async () => {
    const container = await createAstroContainer();
    const locations = [
      { name: 'unknown', fields: {} },
      { name: 'name-only', fields: { location: 'Площадка у реки' } },
      { name: 'coordinates-only', fields: { coordinates: { lat: 54.8, lng: 37.9 } } },
      {
        name: 'both',
        fields: { location: 'Площадка у реки', coordinates: { lat: 54.8, lng: 37.9 } }
      }
    ];
    const evidence = [];
    for (const { name, fields } of locations) {
      const record = event(name, '19.09.2026 17:00', fields);
      const document = documentFor(
        await container.renderToString(EventCard, { props: { event: record } })
      );
      const card = document.querySelector('article');
      const aside = card?.querySelector('aside');
      const preview = aside?.querySelector('map-preview');
      const mapLink = aside?.querySelector('a');
      const mapUrl = mapLink ? new URL(mapLink.href) : undefined;
      evidence.push({
        name,
        cards: document.querySelectorAll('aside').length,
        maps: document.querySelectorAll('map-preview').length,
        mapLinks: document.querySelectorAll('a[href*="yandex.ru/maps/"]').length,
        point: mapUrl?.searchParams.get('pt') ?? undefined,
        query: mapUrl?.searchParams.get('text') ?? undefined,
        mapFallback: preview
          ? !!preview.querySelector('[data-canvas][inert]') &&
            !!preview.querySelector('a[data-fallback]:not([hidden])')
          : undefined,
        locationBetweenHeaderAndBody: aside
          ? aside.previousElementSibling?.tagName === 'HEADER' &&
            !!aside.nextElementSibling?.querySelector('a[href="https://example.com/register"]')
          : undefined
      });
      if (record.location) {
        expect(document.querySelectorAll('aside h2')).toHaveLength(1);
        expect(aside?.querySelector('h2')?.textContent.replaceAll('\u00a0', ' ')).toBe(
          record.location
        );
        expect(card?.querySelector('header')?.textContent.replaceAll('\u00a0', ' ')).not.toContain(
          record.location
        );
        expect(aside?.nextElementSibling?.textContent.replaceAll('\u00a0', ' ')).not.toContain(
          record.location
        );
      }
      if (aside) {
        expect(aside.querySelector('time, a[download]')).toBeFalsy();
        expect(aside.querySelector('h2')?.textContent.trim()).not.toBe('');
      }
    }
    expect(evidence).toMatchInlineSnapshot(`
      [
        {
          "cards": 0,
          "locationBetweenHeaderAndBody": undefined,
          "mapFallback": undefined,
          "mapLinks": 0,
          "maps": 0,
          "name": "unknown",
          "point": undefined,
          "query": undefined,
        },
        {
          "cards": 1,
          "locationBetweenHeaderAndBody": true,
          "mapFallback": undefined,
          "mapLinks": 1,
          "maps": 0,
          "name": "name-only",
          "point": undefined,
          "query": "Площадка у реки",
        },
        {
          "cards": 1,
          "locationBetweenHeaderAndBody": true,
          "mapFallback": true,
          "mapLinks": 2,
          "maps": 1,
          "name": "coordinates-only",
          "point": "37.9,54.8",
          "query": undefined,
        },
        {
          "cards": 1,
          "locationBetweenHeaderAndBody": true,
          "mapFallback": true,
          "mapLinks": 2,
          "maps": 1,
          "name": "both",
          "point": "37.9,54.8",
          "query": undefined,
        },
      ]
    `);
  });

  it('shows full cross-year periods and explicitly dated overnight endings', () => {
    expect([
      formatEventRange(event('period', '2026-12-30', { through: '2027-01-03' })),
      formatEventRange(event('night', '05.01.2026 21:00', { ends_at: '06.01.2026 02:00' }))
    ]).toMatchInlineSnapshot(`
      [
        "30 декабря 2026 – 3 января 2027, включительно",
        "5 января 2026, 21:00 – 6 января 2026, 02:00",
      ]
    `);
  });
});

describe('event calendar pages', () => {
  it('pads six complete weeks with actual dates across both year boundaries and short months', () => {
    const ranges = ['2027-01-01', '2026-12-01', '2021-02-01'].map((date) => {
      const month = buildEventCalendar([event('sample', date)]).months[0]!;
      const cells = buildEventMonthCells(month);
      expect(cells).toHaveLength(42);
      expect(cells.filter((cell) => !cell.inMonth).every((cell) => !cell.day)).toBe(true);
      return {
        month: month.id,
        first: cells[0]?.date,
        last: cells.at(-1)?.date,
        inMonth: cells.filter((cell) => cell.inMonth).length
      };
    });
    expect(ranges).toMatchInlineSnapshot(`
      [
        {
          "first": "2026-12-28",
          "inMonth": 31,
          "last": "2027-02-07",
          "month": "2027-01",
        },
        {
          "first": "2026-11-30",
          "inMonth": 31,
          "last": "2027-01-10",
          "month": "2026-12",
        },
        {
          "first": "2021-02-01",
          "inMonth": 28,
          "last": "2021-03-14",
          "month": "2021-02",
        },
      ]
    `);
  });
  const records = [
    event('may', '2026-05-01'),
    event('period', '2026-08-31', { through: '2026-09-02' }),
    event('september', '19.09.2026 17:00', { status: 'cancelled' })
  ];
  const calendar = buildEventCalendar(records);
  const month = calendar.byMonth.get('2026-09')!;

  it.each([
    ['2026-08-31T21:00:00Z', 'calendar', '2026-08', '/events/2026/09/'],
    ['2026-08-31T21:00:00Z', 'list', '2026-08', '/events/2026/09/list/'],
    ['2026-06-15T12:00:00Z', 'list', '2026-08', undefined],
    ['2026-09-16T12:00:00Z', 'calendar', '2026-09', undefined],
    ['2026-09-16T12:00:00Z', 'list', '2026-09', undefined]
  ])(
    'uses the actual Moscow month at %s for the %s shortcut from %s',
    async (now, view, selectedMonth, expected) => {
      const container = await createAstroContainer();
      const document = documentFor(
        await container.renderToString(EventMonthPage, {
          props: { calendar, month: calendar.byMonth.get(selectedMonth), now: new Date(now), view },
          request: new Request(
            `https://kpshelkovo.online/events/${selectedMonth.replace('-', '/')}/`
          )
        })
      );
      const shortcut = [...document.querySelectorAll('main a')].find(
        (link) => link.textContent.trim() === 'Текущий месяц'
      );
      expect(shortcut?.getAttribute('href')).toBe(expected);
      if (expected) {
        expect(
          [...document.querySelectorAll('.month-navigation a')].map(
            (link) => link.getAttribute('rel') ?? 'current'
          )
        ).toEqual(['prev', 'current', 'next']);
      }
    }
  );

  it('links only occupied dates in a Monday-first grid and preserves the view through navigation', async () => {
    const container = await createAstroContainer();
    const document = documentFor(
      await container.renderToString(EventMonthPage, {
        props: { calendar, month, now: new Date('2026-09-16') },
        request: new Request('https://kpshelkovo.online/events/2026/09/')
      })
    );
    const grid = document.querySelector('section[aria-label^="Календарь:"]');
    expect([...grid!.querySelectorAll('a')].map((link) => link.getAttribute('href')))
      .toMatchInlineSnapshot(`
      [
        "/events/2026/09/01/",
        "/events/2026/09/02/",
        "/events/2026/09/19/",
      ]
    `);
    expect(grid?.querySelectorAll('li')).toHaveLength(42);
    expect(grid?.querySelector('li[aria-hidden="true"]')?.textContent.trim()).toBe('31');
    expect(grid?.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(12);
    expect(
      grid?.querySelector('li[aria-hidden="true"] a, li[aria-hidden="true"] [data-cancelled]')
    ).toBeFalsy();
    expect(grid?.querySelector('a')?.getAttribute('aria-label')).toContain(
      '1 сентября 2026: 1 событие'
    );
    expect(grid?.querySelector('a[href="/events/2026/09/19/"]')?.getAttribute('title')).toContain(
      'все отменены'
    );
    expect(grid?.querySelector('[aria-current]')).toBeFalsy();
    expect(document.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/events/2026/08/');
    expect(
      document.querySelector('nav[aria-label="Вид месяца"] a:last-child')?.getAttribute('href')
    ).toBe('/events/2026/09/list/');
    expect(document.querySelector('[data-pagefind-root], meta[name="robots"]')).toBeFalsy();
  });

  it('deduplicates a period in the month list, links to its start-month detail and canonicalizes to the calendar', async () => {
    const container = await createAstroContainer();
    const document = documentFor(
      await container.renderToString(EventMonthPage, {
        props: { calendar, month, now: new Date('2026-09-16'), view: 'list' },
        request: new Request('https://kpshelkovo.online/events/2026/09/list/')
      })
    );
    expect([...document.querySelectorAll('main h2 a')].map((link) => link.getAttribute('href')))
      .toMatchInlineSnapshot(`
      [
        "/events/2026/08/period-detail/",
        "/events/2026/09/september-detail/",
      ]
    `);
    expect(document.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe(
      '/events/2026/08/list/'
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://kpshelkovo.online/events/2026/09/'
    );
    expect(
      document.querySelector(
        'section[aria-label^="Календарь:"], [data-pagefind-root], meta[name="robots"]'
      )
    ).toBeFalsy();
  });

  it('renders an empty root without fictional month links', async () => {
    const container = await createAstroContainer();
    const document = documentFor(
      await container.renderToString(EventMonthPage, {
        props: { calendar: buildEventCalendar([]), now: new Date('2026-09-16'), root: true },
        request: new Request('https://kpshelkovo.online/events/')
      })
    );
    expect(document.querySelector('main a[href^="/events/"]')).toBeFalsy();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://kpshelkovo.online/events/'
    );
  });

  it('preserves day anchors and compact conditions, then opens full indexed details with return links', async () => {
    const container = await createAstroContainer();
    const evening = event('evening', '02.09.2026 17:00', {
      status: 'conditional',
      price: '600 или 800 рублей',
      audience: 'От 8 лет',
      location: 'Площадка у реки'
    });
    const projection = buildEventCalendar([...records, evening]);
    const day = projection.byDay.get('2026-09-02')!;
    const document = documentFor(
      await container.renderToString(EventEntryPage, {
        props: { day, month },
        request: new Request(`https://kpshelkovo.online${day.url}`)
      })
    );
    expect(
      document.querySelector(
        '[data-pagefind-root], [data-pagefind-body], iframe, map-preview, a[download], a[href="https://example.com/register"]'
      )
    ).toBeFalsy();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeFalsy();
    const links = [...document.querySelectorAll('main h2 a')];
    expect(
      links.map((link) => ({ anchor: link.closest('li')?.id, href: link.getAttribute('href') }))
    ).toMatchInlineSnapshot(`
      [
        {
          "anchor": "period",
          "href": "/events/2026/08/period-detail/",
        },
        {
          "anchor": "evening",
          "href": "/events/2026/09/evening-detail/",
        },
      ]
    `);
    const row = document.getElementById(evening.id);
    expect(row?.textContent.replaceAll('\u00a0', ' ')).toContain(evening.price);
    expect(row?.textContent.replaceAll('\u00a0', ' ')).toContain(evening.audience);
    expect(row?.querySelector('[data-status="conditional"]')).toBeTruthy();
    expect(
      document.getElementById('period')?.querySelector('[data-status="announced"]')
    ).toBeFalsy();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `https://kpshelkovo.online${day.url}`
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      document.title
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    );
    expect(document.querySelectorAll('main a[href="/events/2026/09/"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="robots"]')).toBeFalsy();

    for (const link of links) {
      const record = day.events.find((item) => item.url === link.getAttribute('href'))!;
      const detail = documentFor(
        await container.renderToString(EventEntryPage, {
          props: { event: record, month: projection.byMonth.get(record.startsDate.slice(0, 7))! },
          request: new Request(`https://kpshelkovo.online${record.url}`)
        })
      );
      expect(
        detail.querySelector(
          '[data-pagefind-root][data-search-section-id="events"] article[data-pagefind-body]'
        )
      ).toBeTruthy();
      expect(detail.querySelectorAll('h1')).toHaveLength(1);
      expect(detail.querySelector('h1')?.textContent).toBe(record.title);
      expect(detail.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        `https://kpshelkovo.online${record.url}`
      );
      expect(detail.querySelector('a[href="https://example.com/register"]')).toBeTruthy();
      expect(detail.querySelectorAll('a[href="https://example.com/source"]')).toHaveLength(1);
      expect(detail.querySelector('a[download]')?.getAttribute('href')).toBe(record.icsUrl);
      expect(
        detail.querySelectorAll(
          `main nav a[href="/events/${record.startsDate.replaceAll('-', '/')}/"]`
        )
      ).toHaveLength(1);
      expect(
        detail.querySelectorAll(
          `main nav a[href="/events/${record.startsDate.slice(0, 7).replace('-', '/')}/"]`
        )
      ).toHaveLength(1);
      const schema = z
        .object({
          '@type': z.literal('Event'),
          '@id': z.url(),
          startDate: z.string(),
          endDate: z.string().optional(),
          eventStatus: z.string().optional()
        })
        .parse(JSON.parse(detail.querySelector('script[type="application/ld+json"]')!.textContent));
      expect(schema['@id']).toBe(`https://kpshelkovo.online${record.url}`);
      expect(schema.startDate).toBe(record.startsIso);
      expect(schema.endDate).toBe(record.through);
      if (record.status === 'conditional') expect(schema.eventStatus).toBeUndefined();
    }
  });
});
