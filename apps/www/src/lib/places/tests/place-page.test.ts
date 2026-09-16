/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaceContact, PlaceOpeningHours } from '@/lib/places/types';
import { createAstroContainer } from '@/test/astro-container';

const fixture = vi.hoisted(() => ({
  place: {
    showOnMap: true,
    slug: 'apple-garden',
    name: 'Яблоневый сад',
    category: 'nature' as const,
    status: 'existing' as const,
    summary: 'Сад рядом со спортивной площадкой',
    body: 'Подробное описание места.',
    mentions: [],
    address: 'Адрес места' as string | undefined,
    contact: undefined as PlaceContact | undefined,
    openingHours: undefined as PlaceOpeningHours | undefined,
    coordinates: { lat: 55.06371, lng: 37.724333 },
    mapUrl: 'https://yandex.ru/maps/?pt=37.724333,55.06371',
    url: '/map/apple-garden/',
    markdownUrl: '/map/apple-garden/index.md',
    canonical: 'https://example.com/map/apple-garden/',
    backlinks: {
      events: [],
      news: [
        {
          section: 'news' as const,
          kind: 'article' as const,
          sourceId: '2026/05/apple-garden',
          title: 'В Шелково появился Яблоневый сад',
          htmlUrl: '/news/2026/05/apple-garden/',
          markdownUrl: '/news/2026/05/apple-garden/index.md',
          excerpt: 'Жители высадили первые яблони.',
          mentionedAt: '2026-05-03T09:00:00.000+03:00'
        }
      ],
      status: [],
      reviews: [],
      places: [],
      people: [],
      contacts: []
    }
  },
  neighbors: [] as { readonly slug: string; readonly status: 'planned' | 'underConstruction' }[]
}));

vi.mock('@/lib/places/load', () => ({
  loadPlaces: async () => [
    fixture.place,
    ...fixture.neighbors.map((neighbor) => ({
      ...fixture.place,
      showOnMap: true,
      slug: neighbor.slug,
      name: neighbor.slug,
      status: neighbor.status,
      url: `/map/${neighbor.slug}/`
    }))
  ],
  loadPlaceWithBacklinks: async () => fixture.place
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import PlacePage from '@/pages/map/[slug]/index.astro';

const renderPage = async () => {
  const container = await createAstroContainer();
  const html = await container.renderToString(PlacePage, {
    params: { slug: fixture.place.slug },
    request: new Request(fixture.place.canonical)
  });
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document;
};

const originalPlace = { ...fixture.place };
afterEach(() => {
  Object.assign(fixture.place, originalPlace);
  fixture.neighbors = [];
});

describe('/map/[slug]/', () => {
  it.each([true, false])('offers general-map focus only when showOnMap is %s', async (visible) => {
    fixture.place.showOnMap = visible;
    const document = await renderPage();
    expect(!!document.querySelector('a[href="/map/?h=apple-garden"]')).toBe(visible);
    expect(document.querySelector(`a[href="${fixture.place.mapUrl}"]`)).toBeTruthy();
    expect(document.querySelector('meta[name="robots"][content*="noindex"]')).toBeFalsy();
  });
  it('keeps hours before prose and the address below the preview outside the article', async () => {
    fixture.place.openingHours = {
      periods: [{ days: ['mon'], opensAt: '09:00', closesAt: '18:00' }]
    };
    const document = await renderPage();
    const article = document.querySelector('article');
    const figure = document.querySelector('aside figure');
    expect({
      hoursBeforeBody: !!article?.querySelector('dl + [data-pagefind-body]'),
      bodyRendered:
        article?.querySelector('[data-pagefind-body]')?.textContent === fixture.place.body,
      summaryRendered: article?.textContent.replace(/\s/g, ' ').includes(fixture.place.summary),
      addressInArticle: article?.textContent.includes(fixture.place.address!),
      addressAfterPreview:
        figure?.querySelector('.place-preview ~ figcaption')?.textContent === fixture.place.address,
      actionsByHeading: !!document.querySelector('h1 + nav a[href="/map/?h=apple-garden"]')
    }).toMatchInlineSnapshot(`
      {
        "actionsByHeading": true,
        "addressAfterPreview": true,
        "addressInArticle": false,
        "bodyRendered": true,
        "hoursBeforeBody": true,
        "summaryRendered": false,
      }
    `);
  });

  it('renders a minimal hidden place with summary and a usable no-JS map fallback', async () => {
    fixture.place.showOnMap = false;
    fixture.place.body = '';
    fixture.place.address = undefined;
    const document = await renderPage();
    const preview = document.querySelector('map-preview');
    const fallback = preview?.querySelector('[data-fallback]');
    expect({
      summaryRendered:
        document.querySelector('article [data-pagefind-body]')?.textContent.replace(/\s/g, ' ') ===
        fixture.place.summary,
      emptyBlocks: document.querySelectorAll(
        'article dl, aside figcaption, h1 + nav, aside section'
      ).length,
      fallbackUrl: fallback?.querySelector('a')?.getAttribute('href'),
      fallbackHidden: !!fallback?.closest('[hidden], [aria-hidden="true"], template'),
      fallbackNamed: !!fallback?.querySelector('a')?.textContent.trim()
    }).toMatchInlineSnapshot(`
      {
        "emptyBlocks": 0,
        "fallbackHidden": false,
        "fallbackNamed": true,
        "fallbackUrl": "https://yandex.ru/maps/?pt=37.724333,55.06371",
        "summaryRendered": true,
      }
    `);
  });

  it.each([true, false])(
    'keeps contact actions accessible when showOnMap is %s',
    async (visible) => {
      fixture.place.showOnMap = visible;
      fixture.place.contact = { id: 'food/cafe', url: '/sarafan/food/cafe/' };
      const document = await renderPage();
      const actions = document.querySelector('h1 + nav');
      expect(actions?.querySelectorAll('a').length).toBe(visible ? 2 : 1);
      expect(actions?.querySelector('a[href="/sarafan/food/cafe/"]')).toBeTruthy();
      expect(
        [...actions!.querySelectorAll('a')].every(
          (link) =>
            !!link.getAttribute('aria-label') &&
            !!link.getAttribute('title') &&
            link.getAttribute('tabindex') !== '-1'
        )
      ).toBe(true);
    }
  );

  it('renders nearby links and accessible lifecycle status outside the indexed body without JS', async () => {
    fixture.place.showOnMap = false;
    fixture.neighbors = [
      { slug: 'planned-place', status: 'planned' },
      { slug: 'construction-place', status: 'underConstruction' }
    ];
    const document = await renderPage();
    const nearby = document.querySelector('aside section[aria-labelledby]');
    expect(
      [...nearby!.querySelectorAll('li a')].map((link) => ({
        href: link.getAttribute('href'),
        name: link
          .querySelector(':scope > span:not([aria-hidden])')
          ?.textContent.replace(/\s+/g, ' ')
          .trim(),
        excludedFromIndex: !!link.closest('[data-pagefind-ignore="all"]'),
        insideIndexedBody: !!link.closest('[data-pagefind-body]'),
        hiddenFromAccessibility: !!link.closest('[hidden], [aria-hidden="true"], template'),
        statusHiddenFromAccessibility: !!link
          .querySelector(':scope > span:not([aria-hidden]) > span:last-child')
          ?.closest('[hidden], [aria-hidden="true"]')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "excludedFromIndex": true,
          "hiddenFromAccessibility": false,
          "href": "/map/construction-place/",
          "insideIndexedBody": false,
          "name": "construction-place, Строится",
          "statusHiddenFromAccessibility": false,
        },
        {
          "excludedFromIndex": true,
          "hiddenFromAccessibility": false,
          "href": "/map/planned-place/",
          "insideIndexedBody": false,
          "name": "planned-place, Планируется",
          "statusHiddenFromAccessibility": false,
        },
      ]
    `);
  });

  it('hides incoming links', async () => {
    const document = await renderPage();

    expect({
      hasBacklink: !!document.querySelector('a[href="/news/2026/05/apple-garden/"]'),
      hasBacklinkHeading: !!document.querySelector('#place-backlinks')
    }).toMatchInlineSnapshot(`
      {
        "hasBacklink": false,
        "hasBacklinkHeading": false,
      }
    `);
  });
});
