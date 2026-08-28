/// <reference types="astro/client" />

import { describe, expect, it, vi } from 'vitest';

import {
  newsArticleStaticPaths,
  newsMonthStaticPaths,
  newsTagStaticPaths,
  newsYearStaticPaths,
} from '../static-paths';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as NewsYearPage from '@/pages/news/[year]/index.astro';
import * as NewsYearMarkdownRoute from '@/pages/news/[year]/index.md';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as NewsMonthPage from '@/pages/news/[year]/[month]/index.astro';
import * as NewsMonthMarkdownRoute from '@/pages/news/[year]/[month]/index.md';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as NewsArticlePage from '@/pages/news/[year]/[month]/[entry]/index.astro';
import * as NewsArticleMarkdownRoute from '@/pages/news/[year]/[month]/[entry]/index.md';
import * as NewsEventIcsRoute from '@/pages/news/[year]/[month]/[entry]/[event].ics';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import * as NewsTagPage from '@/pages/news/tags/[tag]/index.astro';
import * as NewsTagMarkdownRoute from '@/pages/news/tags/[tag]/index.md';

const fixtures = vi.hoisted(() => ({
  archives: {
    years: [
      {
        year: 2026,
        months: [
          { year: 2026, month: 11 },
          { year: 2026, month: 1 },
        ],
      },
      { year: 2025, months: [] },
    ],
  },
  articles: [
    { year: 2026, month: 1, entry: 'winter-update', events: [] },
    {
      year: 2025,
      month: 11,
      entry: 'general-meeting',
      events: [{ slug: 'meeting' }],
    },
  ],
  tags: [{ key: 'documents' }, { key: 'meetings' }],
}));

vi.mock('@/lib/news/load', () => ({
  loadNewsArchives: async () => fixtures.archives,
  loadNewsArticles: async () => fixtures.articles,
  loadNewsTags: async () => fixtures.tags,
}));

const routePairs = [
  [
    'year',
    NewsYearPage.getStaticPaths,
    NewsYearMarkdownRoute.getStaticPaths,
    newsYearStaticPaths,
  ],
  [
    'month',
    NewsMonthPage.getStaticPaths,
    NewsMonthMarkdownRoute.getStaticPaths,
    newsMonthStaticPaths,
  ],
  [
    'article',
    NewsArticlePage.getStaticPaths,
    NewsArticleMarkdownRoute.getStaticPaths,
    newsArticleStaticPaths,
  ],
  [
    'tag',
    NewsTagPage.getStaticPaths,
    NewsTagMarkdownRoute.getStaticPaths,
    newsTagStaticPaths,
  ],
] as const;

describe('news static paths', () => {
  it.each(routePairs)(
    'shares the %s implementation and params between HTML and Markdown',
    async (_kind, htmlStaticPaths, markdownStaticPaths, sharedStaticPaths) => {
      expect({
        htmlUsesShared: htmlStaticPaths === sharedStaticPaths,
        markdownUsesShared: markdownStaticPaths === sharedStaticPaths,
      }).toEqual({ htmlUsesShared: true, markdownUsesShared: true });

      const [htmlPaths, markdownPaths] = await Promise.all([
        htmlStaticPaths(),
        markdownStaticPaths(),
      ]);

      expect(markdownPaths).toEqual(htmlPaths);
    },
  );

  it('keeps zero-padded months in shared archive and article params', async () => {
    const [monthPaths, articlePaths] = await Promise.all([
      newsMonthStaticPaths(),
      newsArticleStaticPaths(),
    ]);

    expect({ monthPaths, articlePaths }).toMatchInlineSnapshot(`
      {
        "articlePaths": [
          {
            "params": {
              "entry": "winter-update",
              "month": "01",
              "year": "2026",
            },
          },
          {
            "params": {
              "entry": "general-meeting",
              "month": "11",
              "year": "2025",
            },
          },
        ],
        "monthPaths": [
          {
            "params": {
              "month": "11",
              "year": "2026",
            },
          },
          {
            "params": {
              "month": "01",
              "year": "2026",
            },
          },
        ],
      }
    `);
  });

  it('keeps ICS paths separate and limited to article events', async () => {
    expect({
      sharesArticlePaths:
        NewsEventIcsRoute.getStaticPaths === newsArticleStaticPaths,
      paths: await NewsEventIcsRoute.getStaticPaths(),
    }).toMatchInlineSnapshot(`
      {
        "paths": [
          {
            "params": {
              "entry": "general-meeting",
              "event": "meeting",
              "month": "11",
              "year": "2025",
            },
          },
        ],
        "sharesArticlePaths": false,
      }
    `);
  });
});
