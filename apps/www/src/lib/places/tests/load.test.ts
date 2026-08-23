import { describe, expect, it } from 'vitest';

import {
  createEntityMentionGraph,
  createSiteMentionRegistry,
} from '@/lib/mentions';

import { buildPlacesDataset, buildPlacesGraphDataset } from '../load';
import { createPlaceMentionTarget } from '../mentions';
import type { RawPlace } from '../raw-schema';
import type { PlaceEntry, PlaceGeometry } from '../types';

const geometry: PlaceGeometry = {
  area: {
    precision: 'approximate',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [37.74, 55.05],
          [37.75, 55.05],
          [37.75, 55.06],
          [37.74, 55.05],
        ],
      ],
    },
  },
};

const rawPlace = (overrides?: Partial<RawPlace>): RawPlace => ({
  title: 'Буржуйка',
  name_cases: {
    gen: 'Буржуйки',
  },
  category: 'food',
  marker: 'foodtruck',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  search_aliases: ['где поесть в Форесте'],
  location: {
    map_url: 'https://yandex.ru/navi/-/CTfgq-5r',
    address: 'Шелково Форест, Берёзовая улица, 21А',
    coordinates: { lat: 55.060526, lng: 37.716242 },
  },
  opening_hours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opens_at: '10:00',
        closes_at: '22:00',
      },
    ],
  },
  contact: 'food/burzhuyka',
  ...overrides,
});

const entry = (overrides?: Partial<PlaceEntry>): PlaceEntry => ({
  id: 'burzhuyka',
  body: 'Описание **места**.',
  data: rawPlace(),
  ...overrides,
});

describe('buildPlacesDataset', () => {
  it('maps a Markdown entry and resolves its optional contact', () => {
    const data = buildPlacesDataset([entry()], {
      contactUrls: new Map([['food/burzhuyka', '/sarafan/food/burzhuyka/']]),
    });
    const place = data.places[0];

    expect(place).toMatchInlineSnapshot(`
      {
        "address": "Шелково Форест, Берёзовая улица, 21А",
        "body": "Описание **места**.",
        "canonical": "https://kpshelkovo.online/map/burzhuyka/",
        "category": "food",
        "contact": {
          "id": "food/burzhuyka",
          "url": "/sarafan/food/burzhuyka/",
        },
        "coordinates": {
          "lat": 55.060526,
          "lng": 37.716242,
        },
        "geometry": undefined,
        "mapUrl": "https://yandex.ru/navi/-/CTfgq-5r",
        "markdownUrl": "/map/burzhuyka/index.md",
        "marker": "foodtruck",
        "mentions": [],
        "name": "Буржуйка",
        "nameCases": {
          "gen": "Буржуйки",
        },
        "openingHours": {
          "description": "С 10:00 до 22:00, вторник — выходной",
          "periods": [
            {
              "closesAt": "22:00",
              "days": [
                "mon",
                "wed",
                "thu",
                "fri",
                "sat",
                "sun",
              ],
              "opensAt": "10:00",
            },
          ],
        },
        "searchAliases": [
          "где поесть в Форесте",
        ],
        "slug": "burzhuyka",
        "status": "existing",
        "summary": "Фудтрак в Шелково Форест",
        "url": "/map/burzhuyka/",
      }
    `);
    expect(data.bySlug.get('burzhuyka')).toBe(place);
  });

  it('rejects a missing linked contact', () => {
    expect(() =>
      buildPlacesDataset([entry()]),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: place "burzhuyka" references missing contact "food/burzhuyka"]`,
    );
  });

  it('joins optional geometry by the canonical place slug', () => {
    const data = buildPlacesDataset([entry()], {
      contactUrls: new Map([['food/burzhuyka', '/sarafan/food/burzhuyka/']]),
      geometries: new Map([['burzhuyka', geometry]]),
    });

    expect(data.places[0]?.geometry).toBe(geometry);
  });

  it('rejects geometry without a matching Markdown place', () => {
    expect(() =>
      buildPlacesDataset([entry()], {
        geometries: new Map([['orphan', geometry]]),
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: place geometry "orphan.geojson" has no matching Markdown place]`,
    );
  });

  it('loads a standalone place with a generated map URL', () => {
    const data = buildPlacesDataset([
      entry({
        data: rawPlace({
          contact: undefined,
          location: {
            coordinates: { lat: 55.060703, lng: 37.746894 },
          },
          opening_hours: undefined,
        }),
      }),
    ]);

    expect({
      address: data.places[0]?.address,
      contact: data.places[0]?.contact,
      mapUrl: data.places[0]?.mapUrl,
      openingHours: data.places[0]?.openingHours,
    }).toMatchInlineSnapshot(`
      {
        "address": undefined,
        "contact": undefined,
        "mapUrl": "https://yandex.ru/maps/?pt=37.746894,55.060703&z=18&l=map",
        "openingHours": undefined,
      }
    `);
  });

  it('resolves another place in a place body', () => {
    const mentionRegistry = createSiteMentionRegistry([
      createPlaceMentionTarget('burzhuyka', 'Буржуйка'),
      createPlaceMentionTarget('apple-garden', 'Яблоневый сад', {
        gen: 'Яблоневого сада',
      }),
    ]);
    const data = buildPlacesDataset(
      [entry({ body: 'Можно дойти от @apple-garden:gen.' })],
      {
        contactUrls: new Map([['food/burzhuyka', '/sarafan/food/burzhuyka/']]),
        mentionRegistry,
      },
    );

    expect(data.places[0]?.body).toBe(
      'Можно дойти от [Яблоневого сада](/map/apple-garden/).',
    );
  });

  it('projects site graph refs targeting a place onto the detail dataset', () => {
    const places = buildPlacesDataset([entry()], {
      contactUrls: new Map([['food/burzhuyka', '/sarafan/food/burzhuyka/']]),
    });
    const graph = createEntityMentionGraph([
      {
        target: { type: 'place', slug: 'burzhuyka' },
        source: { section: 'news', kind: 'article', id: '2026/07/food-truck' },
        title: 'В Шелково открылся фудтрак',
        htmlUrl: '/news/2026/07/food-truck/',
        markdownUrl: '/news/2026/07/food-truck/index.md',
      },
    ]);
    const enriched = buildPlacesGraphDataset(places, graph);

    expect(enriched.bySlug.get('burzhuyka')).toBe(enriched.places[0]);
    expect(enriched.places[0]?.backlinks.news).toMatchInlineSnapshot(`
      [
        {
          "excerpt": undefined,
          "htmlUrl": "/news/2026/07/food-truck/",
          "kind": "article",
          "markdownUrl": "/news/2026/07/food-truck/index.md",
          "mentionedAt": undefined,
          "section": "news",
          "sortKey": undefined,
          "sourceId": "2026/07/food-truck",
          "title": "В Шелково открылся фудтрак",
        },
      ]
    `);
  });

  it('rejects a place that mentions itself', () => {
    const mentionRegistry = createSiteMentionRegistry([
      createPlaceMentionTarget('burzhuyka', 'Буржуйка'),
    ]);

    expect(() =>
      buildPlacesDataset([entry({ body: 'Описание @burzhuyka.' })], {
        contactUrls: new Map([['food/burzhuyka', '/sarafan/food/burzhuyka/']]),
        mentionRegistry,
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: place "burzhuyka" body contains self entity mention "place:burzhuyka"]`,
    );
  });
});
