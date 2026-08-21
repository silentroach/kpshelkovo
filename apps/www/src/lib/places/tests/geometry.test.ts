import { describe, expect, it } from 'vitest';

import { parsePlaceGeometryFiles } from '../geometry';

const geometrySource = (ring: readonly (readonly [number, number])[]): string =>
  JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'area',
        properties: {
          kind: 'area',
          precision: 'approximate',
          source: 'openstreetmap',
          source_refs: ['https://www.openstreetmap.org/way/123'],
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  });

describe('parsePlaceGeometryFiles', () => {
  it('maps a strict GeoJSON area to the place domain model', () => {
    const geometries = parsePlaceGeometryFiles({
      '../../data/places/pond.geojson': geometrySource([
        [37.74, 55.05],
        [37.75, 55.05],
        [37.75, 55.06],
        [37.74, 55.05],
      ]),
    });

    expect(geometries.get('pond')).toMatchInlineSnapshot(`
      {
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
                  37.75,
                  55.06,
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
          "source": "openstreetmap",
        },
      }
    `);
  });

  it('rejects an unclosed polygon ring', () => {
    expect(() =>
      parsePlaceGeometryFiles({
        '../../data/places/pond.geojson': geometrySource([
          [37.74, 55.05],
          [37.75, 55.05],
          [37.75, 55.06],
          [37.74, 55.06],
        ]),
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: place geometry "../../data/places/pond.geojson" is invalid: features.0.geometry.coordinates.0: polygon rings must be closed]`,
    );
  });
});
