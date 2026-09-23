import { describe, expect, it } from 'vitest';

import { polygonLabelCoordinates } from './polygon-label';
import type { PolygonGeometry } from './types';

describe('polygon label position', () => {
  it('places the label inside a concave polygon instead of its bounding-box centre', () => {
    const geometry: PolygonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.0009, 0],
          [0.0009, 0.0009],
          [0.0006, 0.0009],
          [0.0006, 0.0003],
          [0.0003, 0.0003],
          [0.0003, 0.0009],
          [0, 0.0009],
          [0, 0]
        ]
      ]
    };
    const [lng, lat] = polygonLabelCoordinates(geometry);

    expect(lng).toBeGreaterThan(0);
    expect(lng).toBeLessThan(0.0009);
    expect(lat).toBeGreaterThan(0);
    expect(lat).toBeLessThan(0.0009);
    expect(lat < 0.0003 || lng < 0.0003 || lng > 0.0006).toBe(true);
  });

  it('avoids holes and leaves the source geometry untouched', () => {
    const geometry: PolygonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.001, 0],
          [0.001, 0.001],
          [0, 0.001],
          [0, 0]
        ],
        [
          [0.0003, 0.0003],
          [0.0007, 0.0003],
          [0.0007, 0.0007],
          [0.0003, 0.0007],
          [0.0003, 0.0003]
        ]
      ]
    };
    const original = JSON.stringify(geometry);
    const [lng, lat] = polygonLabelCoordinates(geometry);

    expect(lng).toBeGreaterThan(0);
    expect(lng).toBeLessThan(0.001);
    expect(lat).toBeGreaterThan(0);
    expect(lat).toBeLessThan(0.001);
    expect(lng < 0.0003 || lng > 0.0007 || lat < 0.0003 || lat > 0.0007).toBe(true);
    expect(JSON.stringify(geometry)).toBe(original);
  });

  it('chooses the separate part with the largest clearance from its boundary', () => {
    const geometry: PolygonGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [0.0001, 0],
            [0.0001, 0.0001],
            [0, 0.0001],
            [0, 0]
          ]
        ],
        [
          [
            [0.002, 0],
            [0.0026, 0],
            [0.0026, 0.0006],
            [0.002, 0.0006],
            [0.002, 0]
          ]
        ]
      ]
    };
    const [lng, lat] = polygonLabelCoordinates(geometry);

    expect(lng).toBeGreaterThan(0.002);
    expect(lng).toBeLessThan(0.0026);
    expect(lat).toBeGreaterThan(0);
    expect(lat).toBeLessThan(0.0006);
  });
});
