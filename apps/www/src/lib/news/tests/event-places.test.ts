import { describe, expect, it } from 'vitest';

import { createEntityMentionGraph, createSiteMentionRegistry } from '@/lib/mentions';
import { buildPlacesGraphDataset } from '@/lib/places/load';
import { buildPlaceMarkdown } from '@/lib/places/markdown';
import { createPlaceMentionTarget } from '@/lib/places/mentions';
import { testPlace } from '@/lib/places/tests/place.test-helper';
import type { Place } from '@/lib/places/types';

import { buildArticleEventIcs } from '../calendar';
import { buildNewsDataset } from '../load';
import { newsArticleEntry, newsArchiveSummaryEntries, newsAuthorEntry } from '../load.test-helper';
import { createNewsArticleMentionRefs } from '../mentions';
import { toNewsPublicPayload } from '../public-dto';
import { newsPublicPayloadSchema } from '../public-schema';
import { newsArticleSchema } from '../seo';
import { buildNewsEventMapUrl } from '../view';
import { newsEventRecord } from './event.test-helper';

const articleEntry = (place?: string, body = '') => ({
  placeSlug: place,
  article: newsArticleEntry({
    id: '2026/05/meeting',
    title: 'Встреча',
    summary: 'Коротко о встрече',
    date: '01.05.2026',
    body,
    events: [
      {
        event: '2026/05/meeting'
      }
    ]
  })
});

const dataset = (entry: ReturnType<typeof articleEntry>, place?: Place) =>
  buildNewsDataset(
    [newsAuthorEntry({ id: 'ig', name: 'Редакция' })],
    [entry.article],
    newsArchiveSummaryEntries([entry.article]),
    {
      eventsById: new Map([
        [
          'meeting',
          newsEventRecord(
            {
              title: 'Встреча',
              starts_at: '02.05.2026 12:00',
              place: entry.placeSlug,
              location_details: entry.placeSlug ? 'В беседке; вход, справа' : undefined
            },
            'Коротко о встрече',
            new Map(place ? [[place.slug, place]] : [])
          )
        ]
      ]),
      mentionRegistry: createSiteMentionRegistry(
        place ? [createPlaceMentionTarget(place.slug, place.name)] : []
      )
    }
  );

describe('event place references', () => {
  it.each([true, false])(
    'resolves a place with showOnMap=%s through the full dataset',
    (showOnMap) => {
      const place = testPlace({ showOnMap });
      const event = dataset(articleEntry(place.slug), place).articles[0]!.events[0]!;
      expect(event.place).toBe(place);
      expect(event.locationDetails).toBe('В беседке; вход, справа');
      expect(buildNewsEventMapUrl(event)).toBe(place.mapUrl);
    }
  );

  it.each(['unknown', 'person-slug'])(
    'rejects a non-place reference %s with shared event context',
    (slug) => {
      expect(() => dataset(articleEntry(slug))).toThrow(
        `event "meeting" references missing place "${slug}"`
      );
    }
  );

  it.each([undefined, 'улица Центральная, 46–48'])(
    'publishes canonical place data with address %s',
    (address) => {
      const place = testPlace({ address });
      const data = dataset(articleEntry(place.slug), place);
      const article = data.articles[0]!;
      const event = article.events[0]!;
      const payload = JSON.parse(JSON.stringify(toNewsPublicPayload(data)));
      const publicEvent = newsPublicPayloadSchema.parse(payload).articles[0]!.events![0]!;
      expect(publicEvent).toMatchObject({
        location: place.name,
        coordinates: place.coordinates,
        map_url: place.mapUrl,
        place_id: place.slug,
        place_url: place.canonical,
        location_details: event.locationDetails
      });
      const schemas = newsArticleSchema({
        name: article.title,
        description: article.summary,
        url: article.url,
        events: article.events
      });
      expect(JSON.parse(JSON.stringify(schemas[1])).location).toEqual({
        '@type': 'Place',
        name: place.name,
        url: place.canonical,
        ...(address ? { address } : {}),
        geo: { '@type': 'GeoCoordinates', latitude: 55, longitude: 38 }
      });
      const ics = buildArticleEventIcs(article, event).replaceAll('\r\n ', '');
      expect(ics).toContain('DESCRIPTION:Коротко о встрече\\n\\nВ беседке\\; вход\\, справа\\n\\n');
      expect(ics).toContain(
        `LOCATION:КП Шелково\\, эко-клуб${address ? `\\, ${address.replaceAll(',', '\\,')}` : ''}\r\n`
      );
      expect(ics).toContain(`URL:${article.canonical}\r\n`);
    }
  );

  it('omits all geographical fields for an event without a place', () => {
    const data = dataset(articleEntry());
    const article = data.articles[0]!;
    const event = article.events[0]!;
    const payload = newsPublicPayloadSchema.parse(
      JSON.parse(JSON.stringify(toNewsPublicPayload(data)))
    );
    expect(payload.articles[0]!.events![0]).toMatchInlineSnapshot(`
      {
        "description": "Коротко о встрече",
        "ics_url": "https://kpshelkovo.online/news/2026/05/meeting/event.ics",
        "slug": "event",
        "starts_at": "2026-05-02T12:00:00+03:00",
        "title": "Встреча",
      }
    `);
    expect(buildNewsEventMapUrl(event)).toBeUndefined();
    expect(buildArticleEventIcs(article, event)).not.toMatch(/LOCATION|GEO:/);
    expect(
      newsArticleSchema({
        name: article.title,
        description: article.summary,
        url: article.url,
        events: article.events
      })[1]
    ).toHaveProperty('location', undefined);
  });

  it('updates old events from canonical place data without changing event identity', () => {
    const before = testPlace();
    const after = testPlace({
      name: 'Новое название',
      address: 'Новый адрес',
      coordinates: { lat: 48.85, lng: 2.35 },
      mapUrl: 'https://yandex.ru/maps/?pt=2.35,48.85'
    });
    const results = [before, after].map((place) => {
      const data = dataset(articleEntry(place.slug), place);
      const article = data.articles[0]!;
      const event = article.events[0]!;
      const ics = buildArticleEventIcs(article, event).replaceAll('\r\n ', '');
      return {
        event,
        publicEvent: toNewsPublicPayload(data).articles[0]!.events![0]!,
        ics,
        schema: newsArticleSchema({
          name: article.title,
          description: article.summary,
          url: article.url,
          events: article.events
        })[1]!
      };
    });
    const [oldResult, newResult] = results;
    expect(newResult!.event.icsUrl).toBe(oldResult!.event.icsUrl);
    expect(newResult!.ics.match(/^UID:.+$/m)?.[0]).toBe(oldResult!.ics.match(/^UID:.+$/m)?.[0]);
    expect(newResult!.event.place).toBe(after);
    expect(newResult!.publicEvent).toMatchObject({
      location: after.name,
      coordinates: after.coordinates
    });
    expect(newResult!.schema.location).toMatchObject({
      name: after.name,
      address: after.address,
      geo: { latitude: 48.85, longitude: 2.35 }
    });
    expect(newResult!.ics).toContain('LOCATION:Новое название\\, Новый адрес');
    expect(newResult!.ics).toContain('GEO:48.85;2.35');
  });

  it.each(['', 'Место встречи: @club.'])(
    'deduplicates event and body refs and publishes the backlink in Markdown: %s',
    (body) => {
      const place = testPlace();
      const article = dataset(articleEntry(place.slug, body), place).articles[0]!;
      const refs = createNewsArticleMentionRefs({
        ...article,
        events: [...article.events, ...article.events]
      });
      expect(refs).toHaveLength(1);
      expect(refs[0]!.target).toEqual({ type: 'place', slug: place.slug });
      const enriched = buildPlacesGraphDataset(
        { places: [place], bySlug: new Map([[place.slug, place]]) },
        createEntityMentionGraph(refs)
      );
      expect(buildPlaceMarkdown(enriched.places[0]!)).toContain(article.markdownUrl);
    }
  );
});
