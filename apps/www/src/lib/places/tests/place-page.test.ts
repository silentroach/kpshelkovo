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
    body: '',
    mentions: [],
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
  it('renders incoming links outside the Pagefind document', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PlacePage, {
      params: { slug: 'apple-garden' },
      request: new Request('https://example.com/map/apple-garden/'),
    });

    expect({
      hasBacklink: html.includes('href="/news/2026/05/apple-garden/"'),
      hasBacklinkHeading: html.includes('Где упоминается'),
      ignoresBacklinksInPagefind: html.includes(
        'aria-labelledby="place-backlinks" class="mt-10 border-t border-border pt-8" data-pagefind-ignore="all"',
      ),
    }).toMatchInlineSnapshot(`
      {
        "hasBacklink": true,
        "hasBacklinkHeading": true,
        "ignoresBacklinksInPagefind": true,
      }
    `);
  });
});
