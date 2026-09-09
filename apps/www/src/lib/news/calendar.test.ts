import { beforeAll, describe, expect, it } from 'vitest';

import type { NewsArticle, NewsEvent } from './types';

let articleEventIcsUrl: typeof import('./routes').articleEventIcsUrl;
let buildArticleEventIcs: typeof import('./calendar').buildArticleEventIcs;
let hasArticleEvents: typeof import('./calendar').hasArticleEvents;

const normalizeIcs = (ics: string): string => ics.replaceAll('\r\n', '\n');

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ articleEventIcsUrl } = await import('./routes'));
  ({ buildArticleEventIcs, hasArticleEvents } = await import('./calendar'));
});

const event = (input?: {
  readonly slug?: string;
  readonly title?: string;
  readonly description?: string;
  readonly location?: string;
  readonly coordinates?: NewsEvent['coordinates'];
  readonly ends?: boolean;
}): NewsEvent => ({
  slug: input?.slug ?? 'event',
  title: input?.title ?? 'Встреча по регламенту',
  description: input?.description,
  startsAt: new Date('2026-05-31T16:00:00.000Z'),
  startsIso: '2026-05-31T19:00:00+03:00',
  startsTime: '19:00',
  icsUrl: `/news/2026/04/ok-meeting-regulation/${input?.slug ?? 'event'}.ics`,
  ...(input?.ends === false
    ? {}
    : {
        endsAt: new Date('2026-05-31T18:00:00.000Z'),
        endsIso: '2026-05-31T21:00:00+03:00',
        endsTime: '21:00'
      }),
  location: input?.location,
  coordinates: input?.coordinates
});

const article = (input?: {
  readonly summary?: string;
  readonly events?: readonly NewsEvent[];
}): NewsArticle => ({
  id: '2026/04/ok-meeting-regulation',
  title: 'ОК согласились на встречу',
  author: {
    id: 'ig',
    name: 'Редакция',
    kind: 'editorial'
  },
  year: 2026,
  month: 4,
  day: 29,
  entry: 'ok-meeting-regulation',
  url: '/news/2026/04/ok-meeting-regulation/',
  markdownUrl: '/news/2026/04/ok-meeting-regulation/index.md',
  canonical: 'https://example.com/news/2026/04/ok-meeting-regulation/',
  publishedAt: new Date('2026-04-28T21:00:00.000Z'),
  publishedIso: '2026-04-29T00:00:00+03:00',
  appliesToAllAreas: true,
  areas: ['river', 'forest', 'park', 'village'],
  tags: [],
  pinned: false,
  photos: [],
  attachments: [],
  events: input?.events ?? [],
  summary: input?.summary ?? 'Коротко о встрече',
  body: '',
  mentions: []
});

describe('buildArticleEventIcs', () => {
  it('builds a valid calendar skeleton', () => {
    const item = event();
    const ics = buildArticleEventIcs(article({ events: [item] }), item);

    expect(normalizeIcs(ics)).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//example.com//News Events//RU
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:news-event-2026-04-ok-meeting-regulation-event@example.com
      DTSTAMP:20260428T210000Z
      DTSTART:20260531T160000Z
      DTEND:20260531T180000Z
      SUMMARY:Встреча по регламенту
      DESCRIPTION:Коротко о встрече
      URL:https://example.com/news/2026/04/ok-meeting-regulation/
      END:VEVENT
      END:VCALENDAR
      "
    `);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('converts Moscow event time to UTC', () => {
    const item = event();
    const ics = buildArticleEventIcs(article({ events: [item] }), item);

    expect(normalizeIcs(ics)).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//example.com//News Events//RU
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:news-event-2026-04-ok-meeting-regulation-event@example.com
      DTSTAMP:20260428T210000Z
      DTSTART:20260531T160000Z
      DTEND:20260531T180000Z
      SUMMARY:Встреча по регламенту
      DESCRIPTION:Коротко о встрече
      URL:https://example.com/news/2026/04/ok-meeting-regulation/
      END:VEVENT
      END:VCALENDAR
      "
    `);
  });

  it('defaults omitted event end to two hours in ICS only', () => {
    const item = event({ ends: false });
    const ics = buildArticleEventIcs(article({ events: [item] }), item);

    expect(normalizeIcs(ics)).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//example.com//News Events//RU
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:news-event-2026-04-ok-meeting-regulation-event@example.com
      DTSTAMP:20260428T210000Z
      DTSTART:20260531T160000Z
      DTEND:20260531T180000Z
      SUMMARY:Встреча по регламенту
      DESCRIPTION:Коротко о встрече
      URL:https://example.com/news/2026/04/ok-meeting-regulation/
      END:VEVENT
      END:VCALENDAR
      "
    `);
  });

  it('escapes text values', () => {
    const item = event({
      title: 'Comma, semi; slash \\ and\nbreak'
    });
    const ics = buildArticleEventIcs(
      article({
        summary: 'Comma, semi; slash \\ and\nbreak',
        events: [item]
      }),
      item
    );

    expect(normalizeIcs(ics)).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//example.com//News Events//RU
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:news-event-2026-04-ok-meeting-regulation-event@example.com
      DTSTAMP:20260428T210000Z
      DTSTART:20260531T160000Z
      DTEND:20260531T180000Z
      SUMMARY:Comma\\, semi\\; slash \\\\ and\\nbreak
      DESCRIPTION:Comma\\, semi\\; slash \\\\ and\\nbreak
      URL:https://example.com/news/2026/04/ok-meeting-regulation/
      END:VEVENT
      END:VCALENDAR
      "
    `);
  });

  it('uses event description when it is provided', () => {
    const item = event({ description: 'Описание календарного события' });
    const ics = buildArticleEventIcs(
      article({
        summary: 'Короткое содержание новости',
        events: [item]
      }),
      item
    );

    expect(ics).toContain('DESCRIPTION:Описание календарного события\r\n');
  });

  it('falls back to article summary when event description is omitted', () => {
    const item = event();
    const ics = buildArticleEventIcs(
      article({
        summary: 'Короткое содержание новости',
        events: [item]
      }),
      item
    );

    expect(ics).toContain('DESCRIPTION:Короткое содержание новости\r\n');
  });

  it('includes article identity, location, geo, and URL', () => {
    const item = event({
      location: 'КП Шелково, эко-клуб',
      coordinates: {
        lat: 55,
        lng: 38
      }
    });
    const ics = buildArticleEventIcs(
      article({
        events: [item]
      }),
      item
    );
    const unfolded = ics.replaceAll('\r\n ', '');

    expect(normalizeIcs(unfolded)).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//example.com//News Events//RU
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:news-event-2026-04-ok-meeting-regulation-event@example.com
      DTSTAMP:20260428T210000Z
      DTSTART:20260531T160000Z
      DTEND:20260531T180000Z
      SUMMARY:Встреча по регламенту
      DESCRIPTION:Коротко о встрече
      URL:https://example.com/news/2026/04/ok-meeting-regulation/
      LOCATION:КП Шелково\\, эко-клуб
      GEO:55;38
      X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE="КП Шелково, эко-клуб":geo:55,38
      END:VEVENT
      END:VCALENDAR
      "
    `);
  });
});

describe('article event route helpers', () => {
  it('builds article-local event URLs', () => {
    expect(
      articleEventIcsUrl({
        year: 2026,
        month: 4,
        entry: 'ok-meeting-regulation',
        event: 'greenwood'
      })
    ).toBe('/news/2026/04/ok-meeting-regulation/greenwood.ics');
  });

  it('marks only event articles as event-route eligible', () => {
    expect(hasArticleEvents(article({ events: [event()] }))).toBe(true);
    expect(hasArticleEvents(article())).toBe(false);
  });
});
