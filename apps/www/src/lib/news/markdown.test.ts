import { describe, expect, it } from 'vitest';

import {
  buildNewsArchiveMarkdown,
  buildNewsArticleMarkdown,
  buildNewsHomeMarkdown,
  buildNewsMonthMarkdown,
  buildNewsYearMarkdown,
} from './markdown';
import type {
  NewsArticle,
  NewsDataset,
  NewsMonthArchive,
  NewsYearArchive,
} from './types';

const article = (input?: Partial<NewsArticle>): NewsArticle => ({
  id: '2026/05/ktp-upgrade',
  title: 'Россети планируют усилить три подстанции в КП Шелково',
  author: {
    id: 'ig',
    name: 'Инициативная группа',
    kind: 'community',
  },
  year: 2026,
  month: 5,
  day: 14,
  entry: 'ktp-upgrade',
  url: '/news/2026/05/ktp-upgrade/',
  markdownUrl: '/news/2026/05/ktp-upgrade/index.md',
  canonical: 'https://example.com/news/2026/05/ktp-upgrade/',
  publishedAt: new Date('2026-05-14T19:16:00.000Z'),
  publishedIso: '2026-05-14T22:16:00+03:00',
  time: '22:16',
  appliesToAllAreas: false,
  areas: ['park', 'village'],
  tags: [
    {
      label: 'электричество',
      key: 'электричество',
      url: '/news/tags/электричество/',
    },
  ],
  pinned: false,
  sourceUrl: 'https://example.com/source',
  photos: [],
  attachments: [],
  events: [],
  summary: 'Краткое описание новости.',
  body: 'Текст новости.',
  mentions: [],
  ...input,
});

const monthArchive = (year: number, month: number): NewsMonthArchive => ({
  id: `${year}/${String(month).padStart(2, '0')}`,
  year,
  month,
  url: `/news/${year}/${String(month).padStart(2, '0')}/`,
  markdownUrl: `/news/${year}/${String(month).padStart(2, '0')}/index.md`,
  count: 1,
  articles: [article({ year, month })],
});

const yearArchive = (
  year: number,
  months: readonly NewsMonthArchive[],
): NewsYearArchive => ({
  year,
  url: `/news/${year}/`,
  markdownUrl: `/news/${year}/index.md`,
  count: months.reduce((total, month) => total + month.count, 0),
  months,
});

describe('buildNewsArticleMarkdown', () => {
  it('puts article metadata into YAML frontmatter without officialness flags', () => {
    const markdown = buildNewsArticleMarkdown(
      article({ searchAliases: ['служебный поисковый алиас'] }),
    );

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Россети планируют усилить три подстанции в КП Шелково
      summary: Краткое описание новости.
      published_at: 2026-05-14T22:16:00+03:00
      author:
        id: ig
        name: Инициативная группа
        kind: community
      areas:
        - Шелково Парк
        - Шелково Вилладж
      tags:
        - электричество
      source_url: https://example.com/source
      ---

      # Россети планируют усилить три подстанции в КП Шелково

      Текст новости.
      "
    `);
    expect(markdown).not.toContain('служебный поисковый алиас');
  });

  it('omits settlement-wide areas', () => {
    const markdown = buildNewsArticleMarkdown(
      article({
        appliesToAllAreas: true,
        areas: ['river', 'forest', 'park', 'village'],
      }),
    );

    expect(markdown).not.toContain('\nareas:\n');
  });

  it('inserts article body as a Markdown fragment without nested frontmatter', () => {
    const markdown = buildNewsArticleMarkdown(
      article({
        body: `---
ignored: true
---

Текст с [важной ссылкой](https://example.com/body).

- первый пункт`,
      }),
    );

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Россети планируют усилить три подстанции в КП Шелково
      summary: Краткое описание новости.
      published_at: 2026-05-14T22:16:00+03:00
      author:
        id: ig
        name: Инициативная группа
        kind: community
      areas:
        - Шелково Парк
        - Шелково Вилладж
      tags:
        - электричество
      source_url: https://example.com/source
      ---

      # Россети планируют усилить три подстанции в КП Шелково

      Текст с [важной ссылкой](https://example.com/body).

      - первый пункт
      "
    `);
  });

  it('keeps month archives without a redundant news subsection', () => {
    expect(
      buildNewsMonthMarkdown({
        archive: {
          id: '2026/05',
          year: 2026,
          month: 5,
          url: '/news/2026/05/',
          markdownUrl: '/news/2026/05/index.md',
          count: 1,
          articles: [article()],
        },
      }),
    ).toMatchInlineSnapshot(`
      "# Новости Шелково за май 2026 г.

      - [Россети планируют усилить три подстанции в КП Шелково](https://kpshelkovo.online/news/2026/05/ktp-upgrade/index.md) — 14 мая 2026, 22:16

        Краткое описание новости.
      "
    `);
  });

  it('keeps year archives as oldest-first month directories', () => {
    const current = yearArchive(2026, [
      monthArchive(2026, 5),
      monthArchive(2026, 4),
    ]);
    const markdown = buildNewsYearMarkdown({
      archive: current,
    });

    expect(markdown).toMatchInlineSnapshot(`
      "# Новости Шелково за 2026 год

      - [Апрель 2026 г.](https://kpshelkovo.online/news/2026/04/index.md) — 1 публикация
      - [Май 2026 г.](https://kpshelkovo.online/news/2026/05/index.md) — 1 публикация
      "
    `);
    expect(markdown).not.toContain(article().title);
  });

  it('lists year links in the archive index', () => {
    const current = yearArchive(2026, [monthArchive(2026, 5)]);
    const previous = yearArchive(2025, [monthArchive(2025, 12)]);

    expect(buildNewsArchiveMarkdown([current, previous]))
      .toMatchInlineSnapshot(`
      "# Архив новостей Шелково

      - [Новости за 2026 год](https://kpshelkovo.online/news/2026/index.md)
      - [Новости за 2025 год](https://kpshelkovo.online/news/2025/index.md)
      "
    `);
  });

  it('links the home Markdown feed to the archive index', () => {
    const latestArticle = article();
    const month = monthArchive(2026, 5);
    const year = yearArchive(2026, [month]);
    const data: NewsDataset = {
      articles: [latestArticle],
      home: { pinned: [], latest: [latestArticle] },
      archives: {
        years: [year],
        byYear: new Map([[year.year, year]]),
        byMonth: new Map([[month.id, month]]),
      },
      tags: [],
      byId: new Map([[latestArticle.id, latestArticle]]),
      byTag: new Map(),
    };

    expect(buildNewsHomeMarkdown(data)).toContain(
      '[Архив новостей](https://kpshelkovo.online/news/archive/index.md)',
    );
  });
});
