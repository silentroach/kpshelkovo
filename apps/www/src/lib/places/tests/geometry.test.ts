import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parsePlaceGeometryFiles } from '../geometry';

const geometrySource = (geometry: unknown, properties: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', id: 0, properties, geometry }]
  });

const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [37.74, 55.05],
      [37.75, 55.05],
      [37.75, 55.06],
      [37.74, 55.05]
    ]
  ]
};

describe('parsePlaceGeometryFiles', () => {
  it('accepts one shared collection with points, lines and polygons under its canonical slug', () => {
    const source = JSON.stringify({
      type: 'FeatureCollection',
      metadata: { name: 'Source' },
      features: [
        {
          type: 'Feature',
          id: 0,
          properties: { iconCaption: 'Gate' },
          geometry: { type: 'Point', coordinates: [37, 55] }
        },
        {
          type: 'Feature',
          id: 'route',
          properties: { 'stroke-dasharray': '5 3' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [37, 55],
              [38, 56]
            ]
          }
        },
        { type: 'Feature', properties: { precision: 'approximate' }, geometry: polygon }
      ]
    });
    const geometries = parsePlaceGeometryFiles({ '../../data/places/pond.geojson': source });

    expect([...geometries.keys()]).toEqual(['pond']);
    expect(
      geometries.get('pond')?.features.map(({ id, geometry, iconCaption, strokeDasharray }) => ({
        id,
        type: geometry.type,
        iconCaption,
        strokeDasharray
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "iconCaption": "Gate",
          "id": 0,
          "strokeDasharray": undefined,
          "type": "Point",
        },
        {
          "iconCaption": undefined,
          "id": "route",
          "strokeDasharray": [
            5,
            3,
          ],
          "type": "LineString",
        },
        {
          "iconCaption": undefined,
          "id": undefined,
          "strokeDasharray": undefined,
          "type": "Polygon",
        },
      ]
    `);
    expect(geometries.get('pond')?.metadata?.name).toBe('Source');
  });

  it('rejects an unknown field on feature ID 0 with the sidecar path', () => {
    expect(() =>
      parsePlaceGeometryFiles({ 'pond.geojson': geometrySource(polygon, { kind: 'area' }) })
    ).toThrow(/place geometry "pond\.geojson".*features\.0\.properties\.kind.*feature 0 \(ID 0\)/);
  });

  it('rejects an empty sidecar with its file path', () => {
    expect(() =>
      parsePlaceGeometryFiles({ 'pond.geojson': '{"type":"FeatureCollection","features":[]}' })
    ).toThrow(/place geometry "pond\.geojson".*features.*at least one feature/u);
  });

  it('rejects duplicate or malformed slugs', () => {
    expect(() =>
      parsePlaceGeometryFiles({
        'a.geojson': geometrySource(polygon),
        'places/a.geojson': geometrySource(polygon)
      })
    ).toThrow('duplicate place geometry for slug "a"');
    expect(() =>
      parsePlaceGeometryFiles({ 'Not-a-Slug.geojson': geometrySource(polygon) })
    ).toThrow('must use [slug].geojson');
  });

  it('keeps the two pond areas, explicit dash and prepared expansion', () => {
    const source = readFileSync(
      new URL('../../../data/places/hunting-ponds.geojson', import.meta.url),
      'utf8'
    );
    const geometry = parsePlaceGeometryFiles({ 'hunting-ponds.geojson': source }).get(
      'hunting-ponds'
    );
    const feature = geometry?.features[0];
    if (feature?.geometry.type !== 'MultiPolygon') throw new Error('pond geometry missing');

    expect(feature.geometry.coordinates).toHaveLength(2);
    expect(feature.geometry.coordinates[0]?.[0]?.[0]).not.toEqual([37.7488622, 55.0559004]);
    expect(feature.strokeDasharray).toEqual([5, 3]);
    expect(feature.precision).toBe('approximate');
    expect(JSON.stringify(geometry)).not.toContain('outline_expansion_meters');
  });
});
