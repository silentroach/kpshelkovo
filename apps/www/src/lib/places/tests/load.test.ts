import { describe, expect, it } from 'vitest';

import { buildPlacesDataset } from '../load';
import type { RawPlace } from '../raw-schema';
import type { PlaceEntry } from '../types';

const rawPlace = (overrides?: Partial<RawPlace>): RawPlace => ({
  title: 'Буржуйка',
  category: 'food',
  status: 'existing',
  updated_at: '2026-08-11',
  summary: 'Фудтрак в Шелково Форест',
  location: {
    map_url: 'https://yandex.ru/navi/-/CTfgq-5r',
    address: 'Шелково Форест, Берёзовая улица, 21А',
    coordinates: { lat: 55.060526, lng: 37.716242 },
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

    expect(
      place && {
        ...place,
        updatedAt: place.updatedAt.toISOString(),
      },
    ).toMatchInlineSnapshot(`
      {
        "address": "Шелково Форест, Берёзовая улица, 21А",
        "body": "Описание **места**.",
        "canonical": "https://kpshelkovo.online/places/burzhuyka/",
        "category": "food",
        "contact": {
          "id": "food/burzhuyka",
          "url": "/sarafan/food/burzhuyka/",
        },
        "coordinates": {
          "lat": 55.060526,
          "lng": 37.716242,
        },
        "evidence": undefined,
        "mapUrl": "https://yandex.ru/navi/-/CTfgq-5r",
        "markdownUrl": "/places/burzhuyka/index.md",
        "mentions": [],
        "name": "Буржуйка",
        "slug": "burzhuyka",
        "status": "existing",
        "summary": "Фудтрак в Шелково Форест",
        "updatedAt": "2026-08-11T00:00:00.000Z",
        "updatedIso": "2026-08-11",
        "url": "/places/burzhuyka/",
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

  it('loads a standalone place without a contact', () => {
    const data = buildPlacesDataset([
      entry({ data: rawPlace({ contact: undefined }) }),
    ]);

    expect(data.places[0]?.contact).toBeUndefined();
  });
});
