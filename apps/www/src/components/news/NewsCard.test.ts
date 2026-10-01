/// <reference types="astro/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import type { NewsListArticle } from '../../lib/news/types';
// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsCard from './NewsCard.astro';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const baseArticle: NewsListArticle = {
  id: '2026/05/pinned',
  title: 'Важная новость',
  author: {
    id: 'editorial',
    name: 'Редакция',
    kind: 'editorial'
  },
  year: 2026,
  month: 5,
  url: '/news/2026/05/pinned/',
  markdownUrl: '/news/2026/05/pinned/index.md',
  publishedAt: new Date('2026-05-14T09:00:00+03:00'),
  publishedIso: '2026-05-14T09:00:00+03:00',
  tags: [],
  pinned: true,
  summary: 'Короткое описание новости.'
};

describe('NewsCard', () => {
  it('uses the Moscow day while preserving the machine datetime and article link', async () => {
    const publishedIso = '2026-05-13T22:00:00.123Z';
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsCard, {
      props: {
        article: { ...baseArticle, publishedIso, publishedAt: new Date(publishedIso) }
      }
    });
    const time = html.match(/<time\b[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/u);

    expect({
      date: time?.[2]?.trim(),
      datetime: time?.[1],
      href: html.match(/<h3[\s\S]*?<a href="([^"]+)"/u)?.[1]
    }).toMatchInlineSnapshot(`
      {
        "date": "14 мая",
        "datetime": "2026-05-13T22:00:00.123Z",
        "href": "/news/2026/05/pinned/",
      }
    `);
  });

  it('announces pinned state without prohibited aria-label on a plain span', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsCard, {
      props: { article: baseArticle }
    });

    const heading = html.match(/<h3[\s\S]*?<\/h3>/u)?.[0] ?? '';

    expect({
      hasAccessiblePinnedLabel: /<span(?![^>]*aria-hidden)[^>]*>Закреплено сверху<\/span>/u.test(
        heading
      ),
      href: heading.match(/<a href="([^"]+)"/u)?.[1],
      hasDecorativePinnedIcon: /title="закреплено сверху" aria-hidden="true"/u.test(heading),
      hasProhibitedAriaLabel: /aria-label=/u.test(heading)
    }).toMatchInlineSnapshot(`
      {
        "hasAccessiblePinnedLabel": true,
        "hasDecorativePinnedIcon": true,
        "hasProhibitedAriaLabel": false,
        "href": "/news/2026/05/pinned/",
      }
    `);
  });
});
