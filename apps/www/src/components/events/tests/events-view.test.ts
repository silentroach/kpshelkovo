/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { buildEventCalendar } from '@/lib/events/calendar-projection';
import { mapRawEvent } from '@/lib/events/mapper';
import { RawEventSchema } from '@/lib/events/raw-schema';
import type { RawEventInput } from '@/lib/events/raw-schema';
import { formatEventRange } from '@/lib/events/view';
// @ts-expect-error Astro components are resolved by Astro/Vitest.
import EventDayPage from '@/pages/events/[year]/[month]/[day].astro';
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
    expect(text).toContain('Место не указано');
    expect(text).toContain(record.price);
    expect(text).toContain(record.audience);
    expect(document.querySelector('[data-status="conditional"]')).toBeTruthy();
    expect(document.querySelector('.event-labels')?.textContent).toMatch(
      /Мастер-классы\s+При наборе группы/
    );
    expect(document.querySelector('dl')?.textContent.replaceAll('\u00a0', ' ')).toMatch(
      /Стоимость\s+600/
    );
    expect(document.querySelector('dl')?.textContent.replaceAll('\u00a0', ' ')).toMatch(
      /Для кого\s+От 6 лет/
    );
    expect(document.querySelectorAll('a[href="https://example.com/source"]')).toHaveLength(1);
    expect(document.querySelector('a[href="https://example.com/register"]')).toBeTruthy();
    expect(document.querySelector('iframe, a[download]')).toBeFalsy();
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
      await container.renderToString(EventCard, { props: { event: record } })
    );
    expect(document.querySelector('article#cancelled [data-status="cancelled"]')).toBeTruthy();
    expect(document.querySelector('h2')?.textContent).toMatch(/Отменено:\s+cancelled/);
    expect(document.querySelector('dl')?.textContent).toMatch(/Место\s+Внешняя площадка/);
    expect(document.querySelector('a[download]')).toBeFalsy();
    expect(document.querySelector('iframe[loading="lazy"]')).toBeTruthy();
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
    expect(document.body.textContent).not.toContain('19:00');
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
  const records = [
    event('may', '2026-05-01'),
    event('period', '2026-08-31', { through: '2026-09-02' }),
    event('september', '19.09.2026 17:00', { status: 'cancelled' })
  ];
  const calendar = buildEventCalendar(records);
  const month = calendar.byMonth.get('2026-09')!;

  it.each([
    ['2026-08-31T21:00:00Z', 'calendar', '/events/2026/09/'],
    ['2026-08-31T21:00:00Z', 'list', '/events/2026/09/list/'],
    ['2026-06-15T12:00:00Z', 'list', undefined]
  ])('uses the actual Moscow month at %s for the %s shortcut', async (now, view, expected) => {
    const container = await createAstroContainer();
    const document = documentFor(
      await container.renderToString(EventMonthPage, {
        props: { calendar, month: calendar.months[0], now: new Date(now), view },
        request: new Request('https://kpshelkovo.online/events/2026/05/')
      })
    );
    const shortcut = [...document.querySelectorAll('main a')].find(
      (link) => link.textContent.trim() === 'Текущий месяц'
    );
    expect(shortcut?.getAttribute('href')).toBe(expected);
  });

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
    expect(grid?.querySelector('li')?.getAttribute('style')).toContain('grid-column-start: 2');
    expect(grid?.querySelector('a')?.getAttribute('aria-label')).toContain(
      '1 сентября 2026: 1 событие'
    );
    expect(document.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/events/2026/08/');
    expect(
      document.querySelector('nav[aria-label="Вид месяца"] a:last-child')?.getAttribute('href')
    ).toBe('/events/2026/09/list/');
    expect(document.querySelector('[data-pagefind-root], meta[name="robots"]')).toBeFalsy();
  });

  it('deduplicates a period in the list, links within the selected month and canonicalizes to its calendar', async () => {
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
        "/events/2026/09/01/#period",
        "/events/2026/09/19/#september",
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

  it('opts days into Pagefind and emits self-canonical metadata and the shared Event identity', async () => {
    const container = await createAstroContainer();
    const day = calendar.byDay.get('2026-09-02')!;
    const document = documentFor(
      await container.renderToString(EventDayPage, {
        props: { day, month },
        request: new Request(`https://kpshelkovo.online${day.url}`)
      })
    );
    expect(
      document.querySelector('[data-pagefind-root][data-search-section-id="events"]')
    ).toBeTruthy();
    expect(
      document.querySelector('[data-pagefind-body] article, article[data-pagefind-body]')
    ).toBeTruthy();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `https://kpshelkovo.online${day.url}`
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      document.title
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    );
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      'https://kpshelkovo.online/events/2026/08/31/#period'
    );
    expect(document.querySelector('main a[href="/events/2026/09/"]')).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')).toBeFalsy();
  });
});
