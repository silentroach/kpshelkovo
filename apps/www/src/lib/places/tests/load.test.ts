import { describe, expect, it } from 'vitest';

import { createPlaceFromContact } from '../load';
import type { PlaceSourceContact } from '../types';

const source = (
  overrides?: Partial<PlaceSourceContact>,
): PlaceSourceContact => ({
  slug: 'burzhuyka',
  title: 'Буржуйка',
  summary: 'Фудтрак в Шелково Форест',
  updatedIso: '2026-08-11',
  hasDetailPage: true,
  url: '/sarafan/food/burzhuyka/',
  location: {
    url: 'https://yandex.ru/navi/-/CTfgq-5r',
    address: 'Шелково Форест, Берёзовая улица, 21А',
    coordinates: {
      lat: 55.060526,
      lng: 37.716242,
    },
  },
  ...overrides,
});

describe('createPlaceFromContact', () => {
  it('maps the selected contact into a map place', () => {
    expect(createPlaceFromContact(source())).toMatchInlineSnapshot(`
      {
        "address": "Шелково Форест, Берёзовая улица, 21А",
        "canonical": "https://kpshelkovo.online/places/burzhuyka/",
        "contactUrl": "/sarafan/food/burzhuyka/",
        "coordinates": {
          "lat": 55.060526,
          "lng": 37.716242,
        },
        "mapUrl": "https://yandex.ru/navi/-/CTfgq-5r",
        "markdownUrl": "/places/burzhuyka/index.md",
        "name": "Буржуйка",
        "slug": "burzhuyka",
        "summary": "Фудтрак в Шелково Форест",
        "updatedIso": "2026-08-11",
        "url": "/places/burzhuyka/",
      }
    `);
  });

  it('rejects a source without a precise map point', () => {
    expect(() =>
      createPlaceFromContact(source({ location: undefined })),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: place source contact "burzhuyka" needs an address and coordinates]`,
    );
  });
});
