/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { NewsListArticle } from '../../lib/news/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsCard from './NewsCard.astro';

const astroSourceAttribute = /\sdata-astro-source-(?:file|loc)="[^"]*"/gu;
const normalizeHtml = (html: string): string =>
  html
    .replace(astroSourceAttribute, '')
    .replace(/>\s+</gu, '><')
    .replace(/</gu, '\n<')
    .trim();

const baseArticle: NewsListArticle = {
  id: '2026/05/pinned',
  title: 'Важная новость',
  author: {
    id: 'editorial',
    name: 'Редакция',
    kind: 'editorial',
  },
  year: 2026,
  month: 5,
  day: 14,
  entry: 'pinned',
  url: '/news/2026/05/pinned/',
  markdownUrl: '/news/2026/05/pinned/index.md',
  canonical: 'https://example.com/news/2026/05/pinned/',
  publishedAt: new Date('2026-05-14T09:00:00+03:00'),
  publishedIso: '2026-05-14T09:00:00+03:00',
  appliesToAllAreas: true,
  areas: [],
  tags: [],
  pinned: true,
  summary: 'Короткое описание новости.',
  events: [],
};

describe('NewsCard', () => {
  it('announces pinned state without prohibited aria-label on a plain span', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsCard, {
      props: { article: baseArticle },
    });

    const heading = normalizeHtml(html.match(/<h3[\s\S]*?<\/h3>/u)?.[0] ?? '')
      .replace(/<path d="[^"]*">\n<\/path>/u, '<path />')
      .split('\n');

    expect(heading).toMatchInlineSnapshot(`
      [
        "<h3 class=\"ui-entry-title flex items-start gap-2\">",
        "<a href=\"/news/2026/05/pinned/\" class=\"ui-link\">Важная новость",
        "</a>",
        "<span class=\"mt-1 inline-flex shrink-0 text-star\" title=\"закреплено сверху\" aria-hidden=\"true\">",
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" class=\"size-4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">",
        "<path />",
        "</svg>",
        "</span>",
        "<span class=\"sr-only\">Закреплено сверху",
        "</span>",
        "</h3>",
      ]
    `);
  });
});
