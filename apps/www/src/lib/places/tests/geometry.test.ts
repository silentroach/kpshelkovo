import { describe, expect, it } from 'vitest';

import { parsePlaceGeometryFiles } from '../geometry';

const geometrySource = (
  ring: readonly (readonly [number, number])[],
  outlineExpansionMeters?: number,
): string =>
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
          outline_expansion_meters: outlineExpansionMeters,
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

  it('expands each polygon beyond the source bounds', () => {
    const geometries = parsePlaceGeometryFiles({
      '../../data/places/pond.geojson': geometrySource(
        [
          [37.74, 55.05],
          [37.75, 55.05],
          [37.75, 55.06],
          [37.74, 55.06],
          [37.74, 55.05],
        ],
        5,
      ),
    });
    const geometry = geometries.get('pond')?.area.geometry;

    if (geometry?.type !== 'Polygon') {
      throw new Error('expanded polygon fixture is missing');
    }

    const ring = geometry.coordinates[0];

    if (!ring) throw new Error('expanded polygon ring is missing');

    const longitudes = ring.map(([lng]) => lng);
    const latitudes = ring.map(([, lat]) => lat);
    const metersPerLongitudeDegree =
      111_320 * Math.cos((55.055 * Math.PI) / 180);
    const expansion = [
      (37.74 - Math.min(...longitudes)) * metersPerLongitudeDegree,
      (Math.max(...longitudes) - 37.75) * metersPerLongitudeDegree,
      (55.05 - Math.min(...latitudes)) * 111_320,
      (Math.max(...latitudes) - 55.06) * 111_320,
    ].map((meters) => Number(meters.toFixed(1)));

    expect(expansion).toMatchInlineSnapshot(`
      [
        5,
        5,
        5,
        5,
      ]
    `);
  });
});
