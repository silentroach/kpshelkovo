import { describe, expect, it } from 'vitest';

import { RawPlaceSchema } from '../raw-schema';

const place = {
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
} as const;

describe('RawPlaceSchema', () => {
  it('accepts a dedicated map place with a contact link', () => {
    expect(RawPlaceSchema.parse(place)).toMatchInlineSnapshot(`
      {
        "category": "food",
        "contact": "food/burzhuyka",
        "location": {
          "address": "Шелково Форест, Берёзовая улица, 21А",
          "coordinates": {
            "lat": 55.060526,
            "lng": 37.716242,
          },
          "map_url": "https://yandex.ru/navi/-/CTfgq-5r",
        },
        "status": "existing",
        "summary": "Фудтрак в Шелково Форест",
        "title": "Буржуйка",
        "updated_at": "2026-08-11",
      }
    `);
  });

  it('requires evidence for a future place', () => {
    expect(() =>
      RawPlaceSchema.parse({ ...place, status: 'planned' }),
    ).toThrowError(/require evidence/u);
  });
});
