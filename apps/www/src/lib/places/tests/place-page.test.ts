/// <reference types="astro/client" />

import { describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

const fixture = vi.hoisted(() => ({
  place: {
    slug: 'apple-garden',
    name: 'Яблоневый сад',
    category: 'nature' as const,
    status: 'existing' as const,
    summary: 'Сад рядом со спортивной площадкой',
    body: 'Подробное описание места.',
    mentions: [],
    address: 'Адрес места',
    coordinates: { lat: 55.06371, lng: 37.724333 },
    mapUrl: 'https://yandex.ru/maps/?pt=37.724333,55.06371',
    url: '/map/apple-garden/',
    markdownUrl: '/map/apple-garden/index.md',
    canonical: 'https://example.com/map/apple-garden/',
    backlinks: {
      news: [
        {
          section: 'news' as const,
          kind: 'article' as const,
          sourceId: '2026/05/apple-garden',
          title: 'В Шелково появился Яблоневый сад',
          htmlUrl: '/news/2026/05/apple-garden/',
          markdownUrl: '/news/2026/05/apple-garden/index.md',
          excerpt: 'Жители высадили первые яблони.',
          mentionedAt: '2026-05-03T09:00:00.000+03:00',
        },
      ],
      status: [],
      reviews: [],
      places: [],
      people: [],
      contacts: [],
      discomfort: [],
    },
  },
}));

vi.mock('@/lib/places/load', () => ({
  loadPlaces: async () => [fixture.place],
  loadPlaceWithBacklinks: async () => fixture.place,
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import PlacePage from '@/pages/map/[slug]/index.astro';

describe('/map/[slug]/', () => {
  it('renders practical information before the detailed description', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PlacePage, {
      params: { slug: 'apple-garden' },
      request: new Request('https://example.com/map/apple-garden/'),
    });
    const article = html.slice(
      html.indexOf('<article'),
      html.indexOf('</article>'),
    );
    const positions = [
      article.indexOf(fixture.place.address),
      article.indexOf('aria-label="Действия с местом"'),
      article.indexOf(fixture.place.body),
    ];

    expect({
      allRendered: positions.every((position) => position >= 0),
      inOrder: positions.every(
        (position, index) => index === 0 || position > positions[index - 1]!,
      ),
      summaryRendered: article.includes(fixture.place.summary),
    }).toMatchInlineSnapshot(`
      {
        "allRendered": true,
        "inOrder": true,
        "summaryRendered": false,
      }
    `);
  });

  it('hides incoming links', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PlacePage, {
      params: { slug: 'apple-garden' },
      request: new Request('https://example.com/map/apple-garden/'),
    });

    expect({
      hasBacklink: html.includes('href="/news/2026/05/apple-garden/"'),
      hasBacklinkHeading: html.includes('Где упоминается'),
    }).toMatchInlineSnapshot(`
      {
        "hasBacklink": false,
        "hasBacklinkHeading": false,
      }
    `);
  });
});
