import { describe, expect, it } from 'vitest';

import { buildNewsArticleMarkdown, buildNewsMonthMarkdown } from './markdown';
import type { NewsArticle } from './types';

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
});
