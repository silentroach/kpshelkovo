import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';
import { EditorialPublicGeometrySchema } from '@/lib/geometry/editorial-public-schema';

import { parsePlaceGeometryFiles } from '../geometry';
import { buildPlaceMapPublicPayload } from '../map-public';
import { selectMapPlaces } from '../map-selection';
import { buildPlacesMarkdown } from '../markdown';
import type { Place } from '../types';

const pondSource = readFileSync(
  new URL('../../../data/places/hunting-ponds.geojson', import.meta.url),
  'utf8'
);
const pondGeometry = parsePlaceGeometryFiles({ 'hunting-ponds.geojson': pondSource }).get(
  'hunting-ponds'
);
if (!pondGeometry) throw new Error('pond sidecar missing');

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
  geometry: pondGeometry,
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
      const hours = JSON.parse(serialized).places[0]?.opening_hours;
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
  it('keeps all existing public place fields apart from geometry', () => {
    const { geometry, ...item } = buildPlaceMapPublicPayload([place]).places[0]!;
    expect(geometry?.type).toBe('FeatureCollection');
    expect(item).toMatchInlineSnapshot(`
      {
        "coordinates": {
          "lat": 55.05717,
          "lng": 37.744987,
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
      }
    `);
  });

  it('publishes prepared pond coordinates and explicit styling without expansion instructions', () => {
    const geometry = buildPlaceMapPublicPayload([place]).places[0]?.geometry;
    const parsed = EditorialPublicGeometrySchema.parse(JSON.parse(JSON.stringify(geometry)));
    const feature = parsed.features[0];
    if (feature?.geometry.type !== 'MultiPolygon') throw new Error('pond geometry missing');

    expect(feature.geometry.coordinates).toHaveLength(2);
    expect(feature.geometry.coordinates[0]?.[0]?.[0]).not.toEqual([37.7488622, 55.0559004]);
    expect(feature.properties).toMatchInlineSnapshot(`
      {
        "fill": "#217ea3",
        "fill-opacity": 0.06,
        "precision": "approximate",
        "stroke": "#217ea3",
        "stroke-dasharray": [
          5,
          3,
        ],
        "stroke-opacity": 0.85,
        "stroke-width": 2,
      }
    `);
    expect(JSON.stringify(geometry)).not.toContain('outline_expansion_meters');
    expect(pondSource).toContain('outline_expansion_meters');
  });

  it('preserves metadata, ID zero, ordinary text and normalized properties in the public collection', () => {
    const source = {
      type: 'FeatureCollection',
      metadata: { name: 'Map', description: '<p>hidden</p>', creator: 'Editor' },
      features: [
        {
          type: 'Feature',
          id: 0,
          properties: {
            description: '**raw**',
            iconCaption: '<b>Gate</b>',
            iconContent: '0',
            'marker-color': '#123456',
            stroke: '#abc',
            'stroke-width': '2',
            'stroke-opacity': '0.5',
            'stroke-dasharray': '5 3',
            fill: '#def',
            'fill-opacity': '0.1'
          },
          geometry: { type: 'Point', coordinates: [37, 55] }
        },
        {
          type: 'Feature',
          id: 1,
          properties: {},
          geometry: { type: 'Point', coordinates: [38, 56] }
        }
      ]
    };
    const geometry = buildPlaceMapPublicPayload([
      { ...place, geometry: parseEditorialGeometry(source, 'fixture') }
    ]).places[0]?.geometry;
    const parsed = EditorialPublicGeometrySchema.parse(JSON.parse(JSON.stringify(geometry)));

    expect(parsed.features.map(({ properties }) => properties.iconContent)).toMatchInlineSnapshot(`
        [
          "0",
          undefined,
        ]
      `);

    expect(parsed.metadata).toMatchInlineSnapshot(`
      {
        "creator": "Editor",
        "description": "<p>hidden</p>",
        "name": "Map",
      }
    `);
    expect(parsed.features[0]).toMatchInlineSnapshot(`
      {
        "geometry": {
          "coordinates": [
            37,
            55,
          ],
          "type": "Point",
        },
        "id": 0,
        "properties": {
          "description": "**raw**",
          "fill": "#def",
          "fill-opacity": 0.1,
          "iconCaption": "<b>Gate</b>",
          "iconContent": "0",
          "marker-color": "#123456",
          "stroke": "#abc",
          "stroke-dasharray": [
            5,
            3,
          ],
          "stroke-opacity": 0.5,
          "stroke-width": 2,
        },
        "type": "Feature",
      }
    `);
  });
});
