import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { buildPlaceMapPublicPayload } from '../map-public';
import { selectMapPlaces } from '../map-selection';
import { buildPlacesMarkdown } from '../markdown';
import { PLACE_TIME, PLACE_WEEKDAYS } from '../schema';
import type { Place } from '../types';

const place: Place = {
  showOnMap: true,
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
            [37.74, 55.05]
          ]
        ]
      }
    }
  },
  mapUrl: 'https://yandex.ru/maps/example',
  openingHours: {
    description: 'Ежедневно с 10:00 до 20:00',
    periods: [
      {
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opensAt: '10:00',
        closesAt: '20:00'
      }
    ]
  },
  url: '/map/hunting-ponds/',
  markdownUrl: '/map/hunting-ponds/index.md',
  canonical: 'https://kpshelkovo.online/map/hunting-ponds/'
};

describe('place map public DTO', () => {
  it.each([undefined, 'Вход со двора.'])(
    'serializes periods with optional explanation %s',
    (description) => {
      const openingHoursSchema = z
        .object({
          description: z.string().trim().min(1).optional(),
          periods: z
            .array(
              z
                .object({
                  days: z.array(z.enum(PLACE_WEEKDAYS)).min(1),
                  opens_at: z.string().regex(PLACE_TIME),
                  closes_at: z.string().regex(PLACE_TIME)
                })
                .strict()
            )
            .min(1)
        })
        .strict();
      const payloadSchema = z.object({
        places: z.array(z.object({ opening_hours: openingHoursSchema }))
      });
      const payload = buildPlaceMapPublicPayload([
        {
          ...place,
          openingHours: {
            description,
            periods: [{ days: ['mon'], opensAt: '09:00', closesAt: '13:00' }]
          }
        }
      ]);
      const serialized = JSON.stringify(payload);
      const hours = payloadSchema.parse(JSON.parse(serialized)).places[0]?.opening_hours;
      expect(hours?.description).toBe(description);
      expect(hours?.periods).toMatchInlineSnapshot(`
      [
        {
          "closes_at": "13:00",
          "days": [
            "mon",
          ],
          "opens_at": "09:00",
        },
      ]
    `);
      expect(serialized.includes('"description":')).toBe(Boolean(description));
    }
  );

  it('uses the same visible selection for JSON and Markdown, including an empty map', () => {
    const hidden = { ...place, slug: 'hidden', name: 'Hidden place', showOnMap: false };
    expect(selectMapPlaces([hidden, place])).toEqual([place]);
    expect(buildPlaceMapPublicPayload([hidden, place])).toEqual(
      buildPlaceMapPublicPayload([place])
    );
    expect(buildPlacesMarkdown([hidden, place])).toBe(buildPlacesMarkdown([place]));
    expect(buildPlaceMapPublicPayload([hidden])).toEqual({ places: [] });
    expect(buildPlacesMarkdown([hidden])).toBe(buildPlacesMarkdown([]));
  });
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
