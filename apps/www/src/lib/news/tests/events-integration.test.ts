import { readFileSync } from 'node:fs';

import { z } from 'astro/zod';
import { Window } from 'happy-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsEventCard from '@/components/news/NewsEventCard.astro';
import { buildEventCalendar } from '@/lib/events/calendar-projection';
import { buildEventIcs } from '@/lib/events/ics';
import * as eventLoad from '@/lib/events/load';
import { mapRawEvent } from '@/lib/events/mapper';
import { RawEventSchema } from '@/lib/events/raw-schema';
import type { EventRecord } from '@/lib/events/types';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import Fixture from '../../../../tests/news-event-card-visual/src/pages/index.astro';
import * as newsLoad from '../load';
import { newsArticleEntry, newsArchiveSummaryEntries, newsAuthorEntry } from '../load.test-helper';
import { toNewsPublicPayload } from '../public-dto';
import { newsPublicPayloadSchema } from '../public-schema';
import { RawNewsEventsSchema } from '../raw-schema';
import { newsArticleSchema } from '../seo';
import { newsEventRecord } from './event.test-helper';

const ids = [
  'victory-day-greenwood-march-2026',
  'victory-day-greenwood-2026',
  'victory-day-shelkovo-memorial-2026',
  'apple-garden-2026',
  'ok-meeting-june-2026'
] as const;
const readMarkdown = (path: string) => {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(
    readFileSync(new URL(path, import.meta.url), 'utf8')
  );
  if (!match) throw new Error(`Missing frontmatter: ${path}`);
  return { data: parse(match[1]) as unknown, body: match[2].trim() };
};
const migrated = ids.map((id) => {
  const entry = readMarkdown(`../../../data/events/${id}.md`);
  return mapRawEvent({ id, data: RawEventSchema.parse(entry.data), body: entry.body });
});
const newsFrontmatter = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.string(),
  events: RawNewsEventsSchema
});
const entries = ['victory-day-greenwood', 'apple-garden', 'ok-meeting-june'].map((slug) => {
  const { data } = readMarkdown(`../../../data/news/articles/2026/05/${slug}.md`);
  const raw = newsFrontmatter.parse(data);
  const entry = newsArticleEntry({
    id: `2026/05/${slug}`,
    title: raw.title,
    summary: raw.summary,
    date: raw.date
  });
  return { ...entry, data: { ...entry.data, events: raw.events } };
});
const authors = [newsAuthorEntry({ id: 'ig', name: 'Редакция' })];
const dataset = (events: readonly EventRecord[] = migrated) =>
  newsLoad.buildNewsDataset(authors, entries, newsArchiveSummaryEntries(entries), {
    eventsById: new Map(events.map((event) => [event.id, event]))
  });
const linkedDataset = (record: EventRecord) => {
  const entry = newsArticleEntry({
    id: '2026/05/linked',
    title: 'Новость',
    summary: 'Описание',
    date: '01.05.2026',
    events: [{ event: record.id }]
  });
  return newsLoad.buildNewsDataset(authors, [entry], newsArchiveSummaryEntries([entry]), {
    eventsById: new Map([[record.id, record]])
  });
};

beforeAll(() =>
  Object.assign(import.meta.env, { SITE: 'https://kpshelkovo.online', BASE_URL: '/' })
);
afterEach(() => vi.restoreAllMocks());

describe('shared events in news', () => {
  it('rejects unresolved references instead of silently dropping a card', () => {
    expect(() => dataset([])).toThrow(
      'references missing event "victory-day-greenwood-march-2026"'
    );
  });

  it('preserves all five published URLs, UIDs, intervals and participants', async () => {
    const data = dataset();
    const payload = newsPublicPayloadSchema.parse(
      JSON.parse(JSON.stringify(toNewsPublicPayload(data)))
    );
    expect(payload.articles.flatMap((article) => article.events ?? [])).toHaveLength(5);
    vi.spyOn(newsLoad, 'loadNewsArticles').mockResolvedValue(data.articles);
    vi.spyOn(newsLoad, 'loadNewsArticle').mockImplementation(async (id) => data.byId.get(id));
    const route = await import('@/pages/news/[year]/[month]/[entry]/[event].ics');
    const paths = await route.getStaticPaths();
    expect(paths).toHaveLength(5);
    const evidence = await Promise.all(
      paths.map(async ({ params }) => {
        const response = await route.GET({ params } as never);
        const ics = (await response.text()).replaceAll('\r\n ', '');
        const article = data.byId.get(`${params.year}/${params.month}/${params.entry}`)!;
        const event = article.events.find((event) => event.slug === params.event)!;
        const publicEvent = payload.articles
          .find((item) => item.id === article.id)!
          .events!.find((item) => item.slug === params.event)!;
        expect(ics).toContain(`URL:${article.canonical}\r\n`);
        expect(response.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
        const sharedIcs = buildEventIcs(event, article.canonical, article.publishedAt).replaceAll(
          '\r\n ',
          ''
        );
        expect(sharedIcs.match(/^UID:(.+)$/m)?.[1]).toBe(ics.match(/^UID:(.+)$/m)?.[1]);
        return {
          url: new URL(publicEvent.ics_url).pathname,
          uid: ics.match(/^UID:(.+)$/m)?.[1].trim(),
          start: publicEvent.starts_at,
          end: publicEvent.ends_at,
          location: publicEvent.location,
          coordinates: publicEvent.coordinates,
          organizer: publicEvent.organizer,
          performer: publicEvent.performer,
          status: ics.match(/^STATUS:(.+)$/m)?.[1].trim()
        };
      })
    );
    expect(evidence).toMatchSnapshot();
  });

  it.each(['compact', 'wide'])(
    'reflects cancellation in %s HTML, legacy JSON, shared JSON-LD and old ICS',
    async (variant) => {
      const data = dataset();
      const article = data.byId.get('2026/05/ok-meeting-june')!;
      const event = article.events[0];
      const container = await createAstroContainer();
      const html = await container.renderToString(NewsEventCard, {
        props: { event, variant }
      });
      expect(html).toContain('Отменено');
      expect(html).not.toContain('download=');
      expect(
        toNewsPublicPayload(data).articles.find((item) => item.id === article.id)?.events?.[0]
          .description
      ).toContain('Отменено.');
      const jsonLd = newsArticleSchema({
        name: article.title,
        description: article.summary,
        url: article.url,
        events: article.events
      });
      expect(jsonLd.find((item) => item['@type'] === 'Event')?.eventStatus).toBe(
        'https://schema.org/EventCancelled'
      );
      expect(buildEventIcs(event, article.canonical, article.publishedAt)).toContain(
        'STATUS:CANCELLED'
      );
      expect(event.endsIso).toBeUndefined();
      expect(jsonLd.find((item) => item['@type'] === 'Event')?.endDate).toBeUndefined();
    }
  );

  it.each([
    { variant: 'compact', through: undefined },
    { variant: 'compact', through: '03.06.2026' },
    { variant: 'wide', through: undefined },
    { variant: 'wide', through: '03.06.2026' }
  ])(
    'renders rich date-only $variant cards completely, through=$through',
    async ({ variant, through }) => {
      const record = newsEventRecord(
        {
          starts_at: '01.06.2026',
          through,
          price: '600 или 800 ₽',
          audience: 'От 8 лет',
          status: 'conditional'
        },
        '**Условие:** от пяти участников. [Запись](https://example.com/register).'
      );
      const data = linkedDataset(record);
      expect(toNewsPublicPayload(data).articles[0].events).toBeUndefined();
      const container = await createAstroContainer();
      const html = await container.renderToString(NewsEventCard, {
        props: { event: data.articles[0].events[0], variant }
      });
      const window = new Window();
      window.document.body.innerHTML = html;
      const document = window.document;
      expect(document.querySelector('strong')?.textContent).toBe('При наборе группы');
      expect(document.querySelector('a[href="https://example.com/register"]')).toBeTruthy();
      expect(document.body.textContent.replaceAll('\u00a0', ' ')).toContain('600 или 800');
      expect(document.body.textContent).toContain('Место уточняется');
      expect(document.body.textContent).not.toContain('00:00');
      expect(!!document.querySelector('[download]')).toBe(!!through);
      expect(document.querySelector('a[href="https://example.com/source"]')).toBeTruthy();
      window.close();
    }
  );

  it('retains the mapped and location-only visual fixture scenarios', async () => {
    const container = await createAstroContainer();
    const window = new Window();
    try {
      window.document.body.innerHTML = await container.renderToString(Fixture);
      const mapped = window.document.querySelector('[data-testid="news-event-card-coordinates"]')!;
      const locationOnly = window.document.querySelector(
        '[data-testid="news-event-card-location-only"]'
      )!;
      expect({
        mapped: {
          mapCount: mapped.querySelectorAll('iframe[loading="lazy"]').length,
          map: mapped.querySelector('a[href*="yandex.ru/maps/"]')?.getAttribute('href'),
          download: mapped.querySelector('[download]')?.getAttribute('href')
        },
        locationOnly: {
          mapCount: locationOnly.querySelectorAll('iframe').length,
          map: locationOnly.querySelector('a[href*="yandex.ru/maps/"]')?.getAttribute('href'),
          download: locationOnly.querySelector('[download]')?.getAttribute('href')
        }
      }).toMatchInlineSnapshot(`
        {
          "locationOnly": {
            "download": "/news/2026/06/entrance/event.ics",
            "map": "https://yandex.ru/maps/?text=%D0%9A%D0%9F%20%D0%A8%D0%B5%D0%BB%D0%BA%D0%BE%D0%B2%D0%BE%2C%20%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D1%8B%D0%B9%20%D0%B2%D1%8A%D0%B5%D0%B7%D0%B4&z=16&l=map",
            "mapCount": 0,
          },
          "mapped": {
            "download": "/news/2026/05/reglament/event.ics",
            "map": "https://yandex.ru/maps/?pt=38.654321,55.123456&z=16&l=map",
            "mapCount": 1,
          },
        }
      `);
    } finally {
      window.close();
    }
  });

  it('does not generate a legacy ICS URL for an unknown-time single date', async () => {
    const data = linkedDataset(newsEventRecord({ starts_at: '01.06.2026' }));
    vi.spyOn(newsLoad, 'loadNewsArticles').mockResolvedValue(data.articles);
    vi.spyOn(newsLoad, 'loadNewsArticle').mockImplementation(async (id) => data.byId.get(id));
    const route = await import('@/pages/news/[year]/[month]/[entry]/[event].ics');
    expect(await route.getStaticPaths()).toEqual([]);
    expect(
      (
        await route.GET({
          params: { year: '2026', month: '05', entry: 'linked', event: 'event' }
        } as never)
      ).status
    ).toBe(404);
  });

  it('uses an updated shared time and location in news, day projection and ICS', () => {
    const record = newsEventRecord({
      starts_at: '02.06.2026 18:30',
      location: 'Новая площадка',
      status: 'conditional'
    });
    const linked = linkedDataset(record).articles[0].events[0];
    const day = buildEventCalendar([record]).days[0].events[0];
    expect([linked.startsIso, linked.location]).toEqual([day.startsIso, day.location]);
    const ics = buildEventIcs(linked, 'https://example.com', new Date('2026-01-01'));
    expect(ics).toContain('DTSTART:20260602T153000Z');
    expect(ics).toContain('LOCATION:Новая площадка');
    expect(
      toNewsPublicPayload(linkedDataset(record)).articles[0].events?.[0].description
    ).toContain('При наборе группы.');
    expect(
      newsArticleSchema({
        name: 'Новость',
        description: 'Описание',
        url: '/news/',
        events: [linked]
      }).find((item) => item['@type'] === 'Event')?.eventStatus
    ).toBeUndefined();
  });

  it('generates new ICS endpoints only for exportable records, including cancelled ones', async () => {
    const dateOnly = newsEventRecord({ starts_at: '01.06.2026' });
    vi.spyOn(eventLoad, 'loadEvents').mockResolvedValue([...migrated, dateOnly]);
    vi.spyOn(eventLoad, 'loadEvent').mockImplementation(async (id) =>
      [...migrated, dateOnly].find((event) => event.id === id)
    );
    const route = await import('@/pages/events/calendar/[id].ics');
    expect((await route.getStaticPaths()).map((path) => path.params.id)).toEqual(ids);
    expect((await route.GET({ params: { id: dateOnly.id } } as never)).status).toBe(404);
    const response = await route.GET({ params: { id: 'ok-meeting-june-2026' } } as never);
    expect(await response.text()).toContain(
      'UID:news-event-2026-05-ok-meeting-june-event@kpshelkovo.online'
    );
  });
});
