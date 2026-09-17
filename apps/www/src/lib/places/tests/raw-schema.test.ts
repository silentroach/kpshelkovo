import { describe, expect, it } from 'vitest';

import { mapRawPlace } from '../mapper';
import { RawPlaceSchema } from '../raw-schema';

const place = {
  title: 'Буржуйка',
  name_cases: {
    gen: 'Буржуйки'
  },
  category: 'food',
  marker: 'foodtruck',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  search_aliases: ['где поесть в Форесте'],
  location: {
    map_url: 'https://yandex.ru/navi/-/CTfgq-5r',
    address: 'Шелково Форест, Берёзовая улица, 21А',
    coordinates: { lat: 55.060526, lng: 37.716242 }
  },
  opening_hours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opens_at: '10:00',
        closes_at: '22:00'
      }
    ]
  },
  contact: 'food/burzhuyka'
} as const;

describe('RawPlaceSchema', () => {
  it.each([undefined, 'Вход со двора.'])(
    'accepts optional opening-hours explanation %s',
    (description) => {
      const openingHours = { description, periods: place.opening_hours.periods };
      expect(RawPlaceSchema.parse({ ...place, opening_hours: openingHours }).opening_hours).toEqual(
        openingHours
      );
    }
  );

  it('accepts an absent schedule but rejects a blank explanation', () => {
    expect(
      RawPlaceSchema.parse({ ...place, opening_hours: undefined }).opening_hours
    ).toBeUndefined();
    expect(
      RawPlaceSchema.safeParse({
        ...place,
        opening_hours: { description: '  ', periods: place.opening_hours.periods }
      }).success
    ).toBe(false);
  });

  it.each([
    ['partial overlap', '12:00', '18:00'],
    ['nested interval', '10:00', '12:00'],
    ['duplicate', '09:00', '13:00'],
    ['touching intervals', '13:00', '18:00']
  ])('rejects %s in either input order', (_, opensAt, closesAt) => {
    const periods = [
      { days: ['mon', 'wed'], opens_at: '09:00', closes_at: '13:00' },
      { days: ['wed', 'fri'], opens_at: opensAt, closes_at: closesAt }
    ];
    for (const ordered of [periods, periods.toReversed()]) {
      const result = RawPlaceSchema.safeParse({ ...place, opening_hours: { periods: ordered } });
      expect(result.success).toBe(false);
      if (result.success) throw new Error('conflicting periods passed validation');
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.message).toContain(
        `conflict on wed: 09:00–13:00 and ${opensAt}–${closesAt}`
      );
      if (opensAt === '13:00') {
        expect(result.error.issues[0]?.message).toContain('write continuous hours as one period');
      }
    }
  });

  it.each([
    { days: ['mon'], opens_at: '14:00', closes_at: '18:00' },
    { days: ['tue'], opens_at: '09:00', closes_at: '13:00' }
  ])('accepts a real break or the same hours on another day: %j', (period) => {
    expect(
      RawPlaceSchema.safeParse({
        ...place,
        opening_hours: {
          periods: [period, { days: ['mon'], opens_at: '09:00', closes_at: '13:00' }]
        }
      }).success
    ).toBe(true);
  });

  it.each([true, false, undefined])(
    'normalizes visibility %s without a local coordinate restriction',
    (showOnMap) => {
      const data = RawPlaceSchema.parse({
        ...place,
        show_on_map: showOnMap,
        location: { coordinates: { lat: 48.85, lng: 2.35 } }
      });
      expect(mapRawPlace({ id: 'remote', body: '', data }).showOnMap).toBe(showOnMap === true);
    }
  );

  it.each([
    { lat: -90, lng: -180 },
    { lat: 90, lng: 180 }
  ])('accepts world coordinate boundaries %j', (coordinates) => {
    expect(RawPlaceSchema.safeParse({ ...place, location: { coordinates } }).success).toBe(true);
  });

  it.each([
    undefined,
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: Number.NaN, lng: 0 },
    { lat: '55', lng: 38 }
  ])('rejects invalid coordinates %j', (coordinates) => {
    expect(RawPlaceSchema.safeParse({ ...place, location: { coordinates } }).success).toBe(false);
  });
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
        "name_cases": {
          "gen": "Буржуйки",
        },
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
        "search_aliases": [
          "где поесть в Форесте",
        ],
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
        location: { coordinates: place.location.coordinates }
      }).location
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
        location: { ...place.location, map_url: mapUrl }
      }).location.map_url
    ).toBe(mapUrl);
  });

  it.each([
    'https://mail.yandex.ru/',
    'https://yandex.ru/mail/',
    'https://yandex.ru/maps-and-more/',
    'https://yandex.ru@evil.example/maps/',
    'http://yandex.ru/maps/',
    'https://yandex.com/maps/'
  ])('rejects a non-map URL: %s', (mapUrl) => {
    const result = RawPlaceSchema.safeParse({
      ...place,
      location: { ...place.location, map_url: mapUrl }
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('non-map URL passed validation');
    }

    expect(result.error.issues.some((issue) => issue.path.join('.') === 'location.map_url')).toBe(
      true
    );
  });
});
