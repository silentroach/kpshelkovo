import { ChangeFreqEnum } from '@astrojs/sitemap';
import { describe, expect, it } from 'vitest';

import { applySitemapMetadata, buildSitemapMetadataIndex } from './sitemap';

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
    const index = buildSitemapMetadataIndex({
      newsArticles: [],
      statusIncidents: [
        {
          url: '/status/incidents/2026/05/electricity/',
          service: 'electricity',
          startedIso: '2026-05-01T08:00:00+03:00',
          endedIso: '2026-05-01T09:00:00+03:00',
          hasPage: true,
        },
        {
          url: '/status/incidents/2026/05/water/',
          service: 'water',
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
    });

    expect({
      home: index.get('/'),
      statusHistory: index.get('/status/history/'),
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
      }
    `);
    expect(index.has('/status/incidents/2026/05/water/')).toBe(false);
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

  it('uses contact updated_at dates for contacts pages', () => {
    const index = buildSitemapMetadataIndex({
      newsArticles: [],
      statusIncidents: [],
      settlements: [],
      meetings: [],
      kbPages: [],
      contacts: [
        {
          category: 'fence',
          url: '/sarafan/fence/ivan-petrov-fence/',
          updatedIso: '2026-07-06',
        },
        {
          category: 'fence',
          url: '/sarafan/fence/sergey/',
          updatedIso: '2026-07-07',
        },
      ],
    });

    expect({
      section: index.get('/sarafan/'),
      category: index.get('/sarafan/fence/'),
      contact: index.get('/sarafan/fence/ivan-petrov-fence/'),
      blankBodyContact: index.get('/sarafan/fence/sergey/'),
    }).toMatchInlineSnapshot(`
      {
        "blankBodyContact": {
          "changefreq": "monthly",
          "lastmod": "2026-07-07",
        },
        "category": {
          "changefreq": "monthly",
          "lastmod": "2026-07-07",
        },
        "contact": {
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
