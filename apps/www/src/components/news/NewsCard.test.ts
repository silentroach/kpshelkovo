/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { NewsListArticle } from '../../lib/news/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsCard from './NewsCard.astro';

const visibleText = (html: string): string =>
  html
    .replace(/<[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/[^>]+>/gu, '')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+/gu, ' ')
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

    const heading = html.match(/<h3[\s\S]*?<\/h3>/u)?.[0] ?? '';

    expect({
      accessibleText: visibleText(heading),
      href: heading.match(/<a href="([^"]+)"/u)?.[1],
      hasDecorativePinnedIcon:
        /title="закреплено сверху" aria-hidden="true"/u.test(heading),
      hasProhibitedAriaLabel: /aria-label=/u.test(heading),
    }).toMatchInlineSnapshot(`
      {
        "accessibleText": "Важная новость Закреплено сверху",
        "hasDecorativePinnedIcon": true,
        "hasProhibitedAriaLabel": false,
        "href": "/news/2026/05/pinned/",
      }
    `);
  });
});
