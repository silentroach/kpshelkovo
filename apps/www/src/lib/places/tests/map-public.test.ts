import { describe, expect, it } from 'vitest';

import { buildPlaceMapPublicPayload } from '../map-public';
import type { Place } from '../types';

const place: Place = {
  slug: 'hunting-ponds',
  name: 'Охотничьи пруды',
  category: 'water',
  marker: 'fish',
  status: 'existing',
  summary: 'Два пруда на территории Шелково',
  body: 'Описание места.',
  mentions: [],
  coordinates: { lat: 55.05717, lng: 37.744987 },
  geometry: {
    area: {
      precision: 'approximate',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [37.74, 55.05],
            [37.75, 55.05],
            [37.74, 55.05],
          ],
        ],
      },
    },
  },
  mapUrl: 'https://yandex.ru/maps/example',
  openingHours: {
    description: 'Ежедневно с 10:00 до 20:00',
    periods: [
      {
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opensAt: '10:00',
        closesAt: '20:00',
      },
    ],
  },
  url: '/map/hunting-ponds/',
  markdownUrl: '/map/hunting-ponds/index.md',
  canonical: 'https://kpshelkovo.online/map/hunting-ponds/',
};

describe('place map public DTO', () => {
  it('keeps the public map feed independent from the full place model', () => {
    expect(buildPlaceMapPublicPayload([place])).toMatchInlineSnapshot(`
      {
        "places": [
          {
            "coordinates": {
              "lat": 55.05717,
              "lng": 37.744987,
            },
            "geometry": {
              "area": {
                "geometry": {
                  "coordinates": [
                    [
                      [
                        37.74,
                        55.05,
                      ],
                      [
                        37.75,
                        55.05,
                      ],
                      [
                        37.74,
                        55.05,
                      ],
                    ],
                  ],
                  "type": "Polygon",
                },
                "precision": "approximate",
              },
            },
            "html_url": "https://kpshelkovo.online/map/hunting-ponds/",
            "marker": "fish",
            "name": "Охотничьи пруды",
            "opening_hours": {
              "description": "Ежедневно с 10:00 до 20:00",
              "periods": [
                {
                  "closes_at": "20:00",
                  "days": [
                    "mon",
                    "tue",
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
            "slug": "hunting-ponds",
            "status": "existing",
          },
        ],
      }
    `);
  });
});
