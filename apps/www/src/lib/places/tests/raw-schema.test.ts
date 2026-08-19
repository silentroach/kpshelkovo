import { describe, expect, it } from 'vitest';

import { RawPlaceSchema } from '../raw-schema';

const place = {
  title: 'Буржуйка',
  category: 'food',
  marker: 'foodtruck',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
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
        "marker": "foodtruck",
        "opening_hours": {
          "description": "С 10:00 до 22:00, вторник — выходной",
          "periods": [
            {
              "closes_at": "22:00",
              "days": [
                "mon",
                "wed",
                "thu",
                "fri",
                "sat",
                "sun",
              ],
              "opens_at": "10:00",
            },
          ],
        },
        "status": "existing",
        "summary": "Фудтрак в Шелково Форест",
        "title": "Буржуйка",
      }
    `);
  });

  it('accepts a place with coordinates only', () => {
    expect(
      RawPlaceSchema.parse({
        ...place,
        location: { coordinates: place.location.coordinates },
      }).location,
    ).toMatchInlineSnapshot(`
      {
        "coordinates": {
          "lat": 55.060526,
          "lng": 37.716242,
        },
      }
    `);
  });

  it('accepts a Yandex Maps coordinate URL', () => {
    const mapUrl = 'https://yandex.ru/maps/?ll=37.746894%2C55.060703&z=18';

    expect(
      RawPlaceSchema.parse({
        ...place,
        location: { ...place.location, map_url: mapUrl },
      }).location.map_url,
    ).toBe(mapUrl);
  });

  it.each([
    'https://mail.yandex.ru/',
    'https://yandex.ru/mail/',
    'https://yandex.ru/maps-and-more/',
    'https://yandex.ru@evil.example/maps/',
    'http://yandex.ru/maps/',
    'https://yandex.com/maps/',
  ])('rejects a non-map URL: %s', (mapUrl) => {
    const result = RawPlaceSchema.safeParse({
      ...place,
      location: { ...place.location, map_url: mapUrl },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('non-map URL passed validation');
    }

    expect(
      result.error.issues.some(
        (issue) => issue.path.join('.') === 'location.map_url',
      ),
    ).toBe(true);
  });
});
