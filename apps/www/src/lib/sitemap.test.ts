import { ChangeFreqEnum } from '@astrojs/sitemap';
import { describe, expect, it } from 'vitest';

import {
  applySitemapMetadata,
  buildSitemapMetadataIndex,
  shouldIncludeSitemapPage,
} from './sitemap';

describe('shouldIncludeSitemapPage', () => {
  it('keeps error pages out and publishes status calendars', () => {
    expect({
      rootErrorPage: shouldIncludeSitemapPage(
        'https://kpshelkovo.online/404/index.html',
      ),
      nestedErrorPage: shouldIncludeSitemapPage(
        'https://kpshelkovo.online/815/compare/404/',
      ),
      statusMonth: shouldIncludeSitemapPage(
        'https://kpshelkovo.online/status/calendar/2026/08/',
      ),
      statusYear: shouldIncludeSitemapPage(
        'https://kpshelkovo.online/status/calendar/2026/',
      ),
      statusIncident: shouldIncludeSitemapPage(
        'https://kpshelkovo.online/status/incidents/2026/08/outage/',
      ),
    }).toMatchInlineSnapshot(`
      {
        "nestedErrorPage": false,
        "rootErrorPage": false,
        "statusIncident": true,
        "statusMonth": true,
        "statusYear": true,
      }
    `);
  });
});

describe('buildSitemapMetadataIndex', () => {
  it('uses publication and update dates for news pages and archives', () => {
    const index = buildSitemapMetadataIndex({
      newsArticles: [
        {
          url: '/news/2026/05/first/',
          publishedIso: '2026-05-02T10:00:00+03:00',
          updatedIso: '2026-05-04T12:30:00+03:00',
          year: 2026,
          month: 5,
          tags: [{ url: '/news/tags/дороги/' }],
        },
        {
          url: '/news/2026/04/older/',
          publishedIso: '2026-04-20T09:00:00+03:00',
          year: 2026,
          month: 4,
          tags: [{ url: '/news/tags/дороги/' }],
        },
      ],
      statusIncidents: [],
      settlements: [],
      meetings: [],
      kbPages: [],
      contacts: [],
    });

    expect({
      home: index.get('/'),
      newsArchive: index.get('/news/archive/'),
      firstArticle: index.get('/news/2026/05/first/'),
      olderArticle: index.get('/news/2026/04/older/'),
      monthArchive: index.get('/news/2026/05/'),
      tag: index.get('/news/tags/дороги/'),
    }).toMatchInlineSnapshot(`
      {
        "firstArticle": {
          "changefreq": "monthly",
          "lastmod": "2026-05-04T12:30:00+03:00",
        },
        "home": {
          "changefreq": "daily",
          "lastmod": "2026-05-04T12:30:00+03:00",
        },
        "monthArchive": {
          "changefreq": "daily",
          "lastmod": "2026-05-04T12:30:00+03:00",
        },
        "newsArchive": {
          "changefreq": "daily",
          "lastmod": "2026-05-04T12:30:00+03:00",
        },
        "olderArticle": {
          "changefreq": "monthly",
          "lastmod": "2026-04-20T09:00:00+03:00",
        },
        "tag": {
          "changefreq": "daily",
          "lastmod": "2026-05-04T12:30:00+03:00",
        },
      }
    `);
  });

  it('uses incident end/start dates and settlement source check dates', () => {
    const index = buildSitemapMetadataIndex(
      {
        newsArticles: [],
        statusIncidents: [
          {
            url: '/status/incidents/2026/05/electricity/',
            service: 'electricity',
            kind: 'incident',
            startedIso: '2026-05-01T08:00:00+03:00',
            endedIso: '2026-05-01T09:00:00+03:00',
            hasPage: true,
          },
          {
            url: '/status/incidents/2026/05/water/',
            service: 'water',
            kind: 'incident',
            startedIso: '2026-05-03T14:00:00+03:00',
            hasPage: false,
          },
        ],
        settlements: [
          {
            slug: 'river',
            sources: [
              { dateChecked: '2026-04-03' },
              { dateChecked: '2026-04-12' },
            ],
          },
          {
            slug: 'forest',
            sources: [{ dateChecked: '2026-03-10' }],
          },
        ],
        meetings: [],
        kbPages: [],
        contacts: [],
      },
      Date.parse('2026-06-02T12:00:00+03:00'),
    );

    expect({
      home: index.get('/'),
      statusHistory: index.get('/status/history/'),
      statusYear: index.get('/status/calendar/2026/'),
      statusMay: index.get('/status/calendar/2026/05/'),
      statusJune: index.get('/status/calendar/2026/06/'),
      electricityService: index.get('/status/electricity/'),
      electricityIncident: index.get('/status/incidents/2026/05/electricity/'),
      compareHome: index.get('/815/compare/'),
      compareRating: index.get('/815/compare/rating/'),
      riverSettlement: index.get('/815/compare/settlements/river/'),
    }).toMatchInlineSnapshot(`
      {
        "compareHome": {
          "changefreq": "monthly",
          "lastmod": "2026-04-12",
        },
        "compareRating": {
          "changefreq": "yearly",
        },
        "electricityIncident": {
          "changefreq": "yearly",
          "lastmod": "2026-05-01T09:00:00+03:00",
        },
        "electricityService": {
          "changefreq": "hourly",
          "lastmod": "2026-05-01T09:00:00+03:00",
        },
        "home": {
          "changefreq": "daily",
          "lastmod": "2026-05-03T14:00:00+03:00",
        },
        "riverSettlement": {
          "changefreq": "monthly",
          "lastmod": "2026-04-12",
        },
        "statusHistory": {
          "changefreq": "hourly",
          "lastmod": "2026-05-03T14:00:00+03:00",
        },
        "statusJune": {
          "changefreq": "hourly",
          "lastmod": "2026-06-02T09:00:00.000Z",
        },
        "statusMay": {
          "changefreq": "hourly",
          "lastmod": "2026-06-02T09:00:00.000Z",
        },
        "statusYear": {
          "changefreq": "hourly",
          "lastmod": "2026-06-02T09:00:00.000Z",
        },
      }
    `);
    expect(index.has('/status/incidents/2026/05/water/')).toBe(false);
  });

  it('keeps bounded calendar windows fresh until their lifecycle ends', () => {
    const data = {
      newsArticles: [],
      statusIncidents: [
        {
          url: '/status/incidents/2026/06/maintenance/',
          service: 'electricity',
          kind: 'maintenance' as const,
          startedIso: '2026-06-10T08:00:00+03:00',
          endedIso: '2026-06-10T12:00:00+03:00',
          hasPage: true,
        },
      ],
      settlements: [],
      meetings: [],
      kbPages: [],
      contacts: [],
    };
    const monthMetadataAt = (nowIso: string) =>
      buildSitemapMetadataIndex(data, Date.parse(nowIso)).get(
        '/status/calendar/2026/06/',
      );

    expect([
      monthMetadataAt('2026-06-09T12:00:00+03:00'),
      monthMetadataAt('2026-06-10T10:00:00+03:00'),
      monthMetadataAt('2026-06-10T12:00:00+03:00'),
    ]).toMatchInlineSnapshot(`
      [
        {
          "changefreq": "hourly",
          "lastmod": "2026-06-09T09:00:00.000Z",
        },
        {
          "changefreq": "hourly",
          "lastmod": "2026-06-10T07:00:00.000Z",
        },
        {
          "changefreq": "yearly",
          "lastmod": "2026-06-10T12:00:00+03:00",
        },
      ]
    `);
  });

  it('publishes the empty current Moscow year with sitemap metadata', () => {
    const index = buildSitemapMetadataIndex(
      {
        newsArticles: [],
        statusIncidents: [],
        settlements: [],
        meetings: [],
        kbPages: [],
        contacts: [],
      },
      Date.parse('2027-01-01T00:30:00+03:00'),
    );

    expect(index.get('/status/calendar/2027/')).toEqual({
      changefreq: ChangeFreqEnum.HOURLY,
    });
  });

  it('uses meeting dates for detail pages without adding a section index', () => {
    const index = buildSitemapMetadataIndex({
      newsArticles: [],
      statusIncidents: [],
      settlements: [],
      meetings: [
        {
          url: '/meetings/updated/',
          dateIso: '2026-06-13T16:00:00+03:00',
          updatedIso: '2026-06-14T10:30:00+03:00',
        },
        {
          url: '/meetings/original/',
          dateIso: '2026-05-20',
        },
      ],
      kbPages: [],
      contacts: [],
    });

    expect({
      updated: index.get('/meetings/updated/'),
      original: index.get('/meetings/original/'),
      section: index.get('/meetings/'),
      home: index.get('/'),
    }).toMatchInlineSnapshot(`
      {
        "home": undefined,
        "original": {
          "changefreq": "yearly",
          "lastmod": "2026-05-20",
        },
        "section": undefined,
        "updated": {
          "changefreq": "yearly",
          "lastmod": "2026-06-14T10:30:00+03:00",
        },
      }
    `);
  });

  it('marks flagged kb pages as excluded from the sitemap', () => {
    const index = buildSitemapMetadataIndex({
      newsArticles: [],
      statusIncidents: [],
      settlements: [],
      meetings: [],
      kbPages: [
        {
          url: '/kb/public/',
          excludeFromSitemap: false,
        },
        {
          url: '/kb/court/01/documents/',
          excludeFromSitemap: true,
        },
      ],
      contacts: [],
    });

    expect(
      applySitemapMetadata(
        { url: 'https://kpshelkovo.online/kb/court/01/documents/' },
        index,
      ),
    ).toBeUndefined();
    expect(
      applySitemapMetadata(
        { url: 'https://kpshelkovo.online/kb/public/' },
        index,
      ),
    ).toEqual({ url: 'https://kpshelkovo.online/kb/public/' });
  });

  it('uses the latest contact updated_at regardless of input order', () => {
    const contacts = [
      {
        category: 'fence',
        url: '/sarafan/fence/ivan-petrov-fence/',
        updatedIso: '2026-07-07',
      },
      {
        category: 'fence',
        url: '/sarafan/fence/sergey/',
        updatedIso: '2026-07-06',
      },
    ];
    const metadataByOrder = [contacts, contacts.toReversed()].map(
      (orderedContacts) => {
        const index = buildSitemapMetadataIndex({
          newsArticles: [],
          statusIncidents: [],
          settlements: [],
          meetings: [],
          kbPages: [],
          contacts: orderedContacts,
        });

        return {
          section: index.get('/sarafan/'),
          category: index.get('/sarafan/fence/'),
          contact: index.get('/sarafan/fence/ivan-petrov-fence/'),
          olderContact: index.get('/sarafan/fence/sergey/'),
        };
      },
    );
    const [newestFirst, newestLast] = metadataByOrder;

    expect(newestFirst).toEqual(newestLast);
    expect(newestFirst).toMatchInlineSnapshot(`
      {
        "category": {
          "changefreq": "monthly",
          "lastmod": "2026-07-07",
        },
        "contact": {
          "changefreq": "monthly",
          "lastmod": "2026-07-07",
        },
        "olderContact": {
          "changefreq": "monthly",
          "lastmod": "2026-07-06",
        },
        "section": {
          "changefreq": "monthly",
          "lastmod": "2026-07-07",
        },
      }
    `);
  });
});

describe('applySitemapMetadata', () => {
  it('adds metadata only for known paths', () => {
    const index = new Map([
      [
        '/news/',
        {
          lastmod: '2026-05-04T12:30:00+03:00',
          changefreq: ChangeFreqEnum.DAILY,
        },
      ],
    ]);

    expect(
      applySitemapMetadata({ url: 'https://kpshelkovo.online/news/' }, index),
    ).toEqual({
      url: 'https://kpshelkovo.online/news/',
      lastmod: '2026-05-04T12:30:00+03:00',
      changefreq: 'daily',
    });
    expect(
      applySitemapMetadata({ url: 'https://kpshelkovo.online/people/' }, index),
    ).toEqual({ url: 'https://kpshelkovo.online/people/' });
  });
});
