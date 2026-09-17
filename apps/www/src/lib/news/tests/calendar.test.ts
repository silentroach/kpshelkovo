import { describe, expect, it } from 'vitest';

import { testPlace } from '@/lib/places/tests/place.test-helper';

import { articleEventIcsFilename, buildArticleEventIcs, hasArticleEvents } from '../calendar';
import { articleEventIcsUrl } from '../routes';
import type { NewsArticle, NewsEvent } from '../types';

const event: NewsEvent = {
  slug: 'event',
  title: 'Встреча по регламенту',
  startsAt: new Date('2026-05-31T19:00:00+03:00'),
  startsIso: '2026-05-31T19:00:00+03:00',
  startsTime: '19:00',
  icsUrl: '/news/2026/04/ok-meeting-regulation/event.ics'
};

const article: NewsArticle = {
  id: '2026/04/ok-meeting-regulation',
  title: 'ОК согласились на встречу',
  author: { id: 'ig', name: 'Редакция', kind: 'editorial' },
  year: 2026,
  month: 4,
  day: 29,
  entry: 'ok-meeting-regulation',
  url: '/news/2026/04/ok-meeting-regulation/',
  markdownUrl: '/news/2026/04/ok-meeting-regulation/index.md',
  canonical: 'https://example.com/news/2026/04/ok-meeting-regulation/',
  publishedAt: new Date('2026-04-29T00:00:00+03:00'),
  publishedIso: '2026-04-29T00:00:00+03:00',
  appliesToAllAreas: true,
  areas: ['river', 'forest', 'park', 'village'],
  tags: [],
  pinned: false,
  photos: [],
  attachments: [],
  events: [event],
  summary: 'Коротко о встрече',
  body: '',
  mentions: []
};

const lines = (item: NewsEvent): readonly string[] =>
  buildArticleEventIcs(article, item).replaceAll('\r\n ', '').split('\r\n');

describe('buildArticleEventIcs', () => {
  it('keeps news identity, title, article URL and publication timestamp', () => {
    expect(lines(event).filter((line) => /^(UID|PRODID|DTSTAMP|SUMMARY|URL):/.test(line)))
      .toMatchInlineSnapshot(`
        [
          "PRODID:-//example.com//News Events//RU",
          "UID:news-event-2026-04-ok-meeting-regulation-event@example.com",
          "DTSTAMP:20260428T210000Z",
          "SUMMARY:Встреча по регламенту",
          "URL:https://example.com/news/2026/04/ok-meeting-regulation/",
        ]
      `);
  });

  it('preserves explicit Moscow times with an end on the next UTC date', () => {
    const item = { ...event, endsAt: new Date('2026-06-01T04:15:00+03:00') };
    expect(lines(item).filter((line) => /^DT(START|END):/.test(line))).toMatchInlineSnapshot(`
      [
        "DTSTART:20260531T160000Z",
        "DTEND:20260601T011500Z",
      ]
    `);
  });

  it('defaults omitted event end to two hours in ICS only', () => {
    expect(lines(event).filter((line) => /^DT(START|END):/.test(line))).toMatchInlineSnapshot(`
      [
        "DTSTART:20260531T160000Z",
        "DTEND:20260531T180000Z",
      ]
    `);
    expect(event.endsAt).toBeUndefined();
  });

  it.each([
    [undefined, 'Коротко о встрече'],
    ['Описание события', 'Описание события']
  ])('selects description %s and appends meeting details', (description, expected) => {
    const item = { ...event, description, place: testPlace(), locationDetails: 'В беседке' };
    expect(lines(item)).toContain(`DESCRIPTION:${expected}\\n\\nВ беседке`);
    expect(lines({ ...item, locationDetails: undefined })).toContain(`DESCRIPTION:${expected}`);
  });

  it('keeps UID after content, time and place edits', () => {
    const changed = {
      ...event,
      title: 'Новая встреча',
      description: 'Новое описание',
      startsAt: new Date('2027-01-01T00:00:00Z'),
      place: testPlace()
    };
    expect(lines(changed).find((line) => line.startsWith('UID:'))).toBe(
      lines(event).find((line) => line.startsWith('UID:'))
    );
    expect(lines(changed)).toContain('DTSTART:20270101T000000Z');
  });
});

describe('article event route helpers', () => {
  it('keeps article-local event URLs and download names', () => {
    expect({
      url: articleEventIcsUrl({ year: 2026, month: 4, entry: article.entry, event: 'greenwood' }),
      filename: articleEventIcsFilename({ slug: 'greenwood' }),
      sanitizedFilename: articleEventIcsFilename({ slug: ' GreenWood! ' })
    }).toMatchInlineSnapshot(`
      {
        "filename": "greenwood.ics",
        "sanitizedFilename": "greenwood.ics",
        "url": "/news/2026/04/ok-meeting-regulation/greenwood.ics",
      }
    `);
  });

  it('marks past events without a place as route eligible', () => {
    expect(hasArticleEvents(article)).toBe(true);
    expect(hasArticleEvents({ ...article, events: [] })).toBe(false);
  });
});
