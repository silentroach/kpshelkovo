import { describe, expect, it } from 'vitest';

import { unionPolygonGeometries } from '../index';
import type { PolygonGeometry } from '../types';

const polygon = (
  coordinates: Extract<PolygonGeometry, { type: 'Polygon' }>['coordinates']
): Extract<PolygonGeometry, { type: 'Polygon' }> => ({
  type: 'Polygon',
  coordinates
});

const square = (x: number, y: number, size = 1) =>
  polygon([
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
      [x, y]
    ]
  ]);

describe('unionPolygonGeometries', () => {
  it('merges polygons sharing an edge', () => {
    expect(unionPolygonGeometries([square(0, 0), square(1, 0)])).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                0,
                0,
              ],
              [
                2,
                0,
              ],
              [
                2,
                1,
              ],
              [
                0,
                1,
              ],
              [
                0,
                0,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
  });

  it('keeps corner-touching polygons separate', () => {
    expect(unionPolygonGeometries([square(0, 0), square(1, 1)])).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                0,
                0,
              ],
              [
                1,
                0,
              ],
              [
                1,
                1,
              ],
              [
                0,
                1,
              ],
              [
                0,
                0,
              ],
            ],
          ],
          [
            [
              [
                1,
                1,
              ],
              [
                2,
                1,
              ],
              [
                2,
                2,
              ],
              [
                1,
                2,
              ],
              [
                1,
                1,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
  });

  it('keeps polygons separated by a gap separate', () => {
    expect(unionPolygonGeometries([square(0, 0), square(2, 0)])).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                0,
                0,
              ],
              [
                1,
                0,
              ],
              [
                1,
                1,
              ],
              [
                0,
                1,
              ],
              [
                0,
                0,
              ],
            ],
          ],
          [
            [
              [
                2,
                0,
              ],
              [
                3,
                0,
              ],
              [
                3,
                1,
              ],
              [
                2,
                1,
              ],
              [
                2,
                0,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
  });

  it('preserves holes', () => {
    const withHole = polygon([
      [
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
        [0, 0]
      ],
      [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 1]
      ]
    ]);

    expect(unionPolygonGeometries([withHole])).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                0,
                0,
              ],
              [
                3,
                0,
              ],
              [
                3,
                3,
              ],
              [
                0,
                3,
              ],
              [
                0,
                0,
              ],
            ],
            [
              [
                1,
                1,
              ],
              [
                1,
                2,
              ],
              [
                2,
                2,
              ],
              [
                2,
                1,
              ],
              [
                1,
                1,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
  });

  it('flattens MultiPolygon input', () => {
    const geometry: PolygonGeometry = {
      type: 'MultiPolygon',
      coordinates: [square(0, 0).coordinates, square(2, 0).coordinates]
    };

    expect(unionPolygonGeometries([geometry])).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                0,
                0,
              ],
              [
                1,
                0,
              ],
              [
                1,
                1,
              ],
              [
                0,
                1,
              ],
              [
                0,
                0,
              ],
            ],
          ],
          [
            [
              [
                2,
                0,
              ],
              [
                3,
                0,
              ],
              [
                3,
                1,
              ],
              [
                2,
                1,
              ],
              [
                2,
                0,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
  });

  it('returns empty MultiPolygon for empty input and does not mutate input', () => {
    const geometries = [square(0, 0), square(1, 0)] as const;
    const before = JSON.stringify(geometries);

    expect(unionPolygonGeometries([])).toEqual({ type: 'MultiPolygon', coordinates: [] });
    unionPolygonGeometries(geometries);
    expect(JSON.stringify(geometries)).toBe(before);
  });
});
