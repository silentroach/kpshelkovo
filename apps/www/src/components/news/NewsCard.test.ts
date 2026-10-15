/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import type { NewsListArticle } from '../../lib/news/types';
// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsCard from './NewsCard.astro';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const window = new Window();
const document = window.document;
afterAll(() => window.happyDOM.close());

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

  it('keeps the pinned label visible in metadata outside the native heading link', async () => {
    const container = await createAstroContainer();
    const states = [];
    for (const pinned of [true, false]) {
      document.body.innerHTML = await container.renderToString(NewsCard, {
        props: { article: { ...baseArticle, pinned } }
      });
      const heading = document.querySelector('h3');
      const link = heading?.querySelector('a[href]');
      const metadata = document.querySelector('.news-card__meta');
      const label = document.querySelector('.news-card__pinned-label');

      states.push({
        pinned,
        hasLabel: Boolean(label),
        hasTextLabel: Boolean(label?.textContent.trim()),
        labelSharesMetadataWithDate: Boolean(
          label && metadata?.contains(label) && metadata.querySelector('time[datetime]')
        ),
        labelInsideHeading: Boolean(label && heading?.contains(label)),
        labelHidden: Boolean(label?.closest('[hidden], [aria-hidden="true"], .sr-only')),
        hasProhibitedSpanAriaLabel: Boolean(document.querySelector('span[aria-label]')),
        headingContainsOnlyArticleTitle: heading?.textContent.trim() === baseArticle.title,
        nativeArticleLink:
          link?.getAttribute('href') === baseArticle.url &&
          !link.hasAttribute('role') &&
          !link.hasAttribute('tabindex')
      });
    }

    expect(states).toMatchInlineSnapshot(`
      [
        {
          "hasLabel": true,
          "hasProhibitedSpanAriaLabel": false,
          "hasTextLabel": true,
          "headingContainsOnlyArticleTitle": true,
          "labelHidden": false,
          "labelInsideHeading": false,
          "labelSharesMetadataWithDate": true,
          "nativeArticleLink": true,
          "pinned": true,
        },
        {
          "hasLabel": false,
          "hasProhibitedSpanAriaLabel": false,
          "hasTextLabel": false,
          "headingContainsOnlyArticleTitle": true,
          "labelHidden": false,
          "labelInsideHeading": false,
          "labelSharesMetadataWithDate": false,
          "nativeArticleLink": true,
          "pinned": false,
        },
      ]
    `);
  });
});
