import { expect, it } from 'vitest';

import type { PlaceMapItem } from '@/lib/places/map-types';

import {
  createMapFeatures,
  fromPublicEditorialGeometry,
  getMarkerScale,
  getPaddedBounds,
  getPlaceBounds
} from '../place-map-geometry';

const place = (slug: string, lng: number, lat: number): PlaceMapItem => ({
  slug,
  name: slug,
  status: 'existing',
  coordinates: { lng, lat },
  url: `/map/${slug}/`
});

it('frames canonical places independently of editorial geometry', () => {
  const remote = place('remote', 2.35, 48.85);
  const local = place('local', 37.72, 55.06);
  expect(getPlaceBounds([remote])).toMatchInlineSnapshot(`
    [
      [
        2.349,
        48.849,
      ],
      [
        2.351,
        48.851,
      ],
    ]
  `);
  expect(getPlaceBounds([remote, local])[1][0]).toBeGreaterThan(37.72);
  expect(getPlaceBounds([])).toMatchInlineSnapshot(`
    [
      [
        37.708,
        55.049,
      ],
      [
        37.764,
        55.081,
      ],
    ]
  `);
  expect(createMapFeatures([remote, local]).map(({ id, geometry }) => ({ id, geometry })))
    .toMatchInlineSnapshot(`
      [
        {
          "geometry": {
            "coordinates": [
              2.35,
              48.85,
            ],
            "type": "Point",
          },
          "id": "remote",
        },
        {
          "geometry": {
            "coordinates": [
              37.72,
              55.06,
            ],
            "type": "Point",
          },
          "id": "local",
        },
      ]
    `);
});

it('keeps existing padded cluster extent and marker scale', () => {
  expect(
    getPaddedBounds([
      [37.716242, 55.060526],
      [37.746894, 55.060703]
    ])
  ).toMatchInlineSnapshot(`
      [
        [
          37.707046,
          55.060473,
        ],
        [
          37.75609,
          55.060756,
        ],
      ]
    `);
  expect([13.5, 15, 16, 17, 18, 19].map((zoom) => getMarkerScale(zoom).toFixed(3)))
    .toMatchInlineSnapshot(`
      [
        "0.625",
        "0.850",
        "1.000",
        "1.150",
        "1.300",
        "1.300",
      ]
    `);
});

it('maps prepared public properties without changing coordinates or applying another expansion', () => {
  const ring: [number, number][] = [
    [37.74, 55.05],
    [37.75, 55.05],
    [37.74, 55.05]
  ];
  const result = fromPublicEditorialGeometry({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 0,
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          stroke: '#123456',
          'stroke-width': 2.5,
          'stroke-opacity': 0.6,
          'stroke-dasharray': [6, 3],
          fill: '#abcdef',
          'fill-opacity': 0.2,
          description: '<b>hidden</b>',
          precision: 'approximate'
        }
      }
    ]
  });
  expect(result.features[0]).toMatchObject({
    id: 0,
    geometry: { type: 'Polygon', coordinates: [ring] },
    stroke: '#123456',
    strokeWidth: 2.5,
    strokeOpacity: 0.6,
    strokeDasharray: [6, 3],
    fill: '#abcdef',
    fillOpacity: 0.2,
    description: '<b>hidden</b>',
    precision: 'approximate'
  });
});
