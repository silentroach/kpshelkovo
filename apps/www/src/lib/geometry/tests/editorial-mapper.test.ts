import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseEditorialGeometry } from '../editorial-mapper';
import { RawEditorialGeometrySchema } from '../editorial-schema';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../../../../docs/research/editorial-maps/${name}.geojson`, import.meta.url),
      'utf8'
    )
  );

const polygon = [
  [
    [37, 55],
    [37.01, 55],
    [37.01, 55.01],
    [37, 55.01],
    [37, 55]
  ],
  [
    [37.003, 55.003],
    [37.007, 55.003],
    [37.007, 55.007],
    [37.003, 55.007],
    [37.003, 55.003]
  ]
];
const collection = (
  geometry: unknown,
  properties: Record<string, unknown> = {},
  id: string | number = 0
) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', id, geometry, properties }]
});

describe('editorial geometry boundary', () => {
  it('accepts both unchanged Yandex exports and preserves their metadata, text and normalized widths', () => {
    const detour = parseEditorialGeometry(fixture('yandex-detour'), 'detour.geojson');
    const polygons = parseEditorialGeometry(fixture('yandex-polygons'), 'polygons.geojson');

    expect(detour.features.map(({ id, geometry }) => [id, geometry.type])).toMatchInlineSnapshot(`
      [
        [
          0,
          "LineString",
        ],
        [
          1,
          "Point",
        ],
        [
          2,
          "Point",
        ],
        [
          3,
          "Point",
        ],
      ]
    `);
    expect(detour.metadata?.description).toBeTruthy();
    expect(detour.features[0]?.strokeWidth).toBe(5);
    expect(detour.features[2]?.description).toBeTruthy();
    expect(
      polygons.features[1]?.geometry.type === 'Polygon'
        ? polygons.features[1].geometry.coordinates.length
        : 0
    ).toBe(2);
  });

  it('maps each shape, string ID, explicit dash and unparsed descriptions without changing the source', () => {
    const input = {
      ...collection(
        { type: 'Point', coordinates: [37, 55] },
        {
          iconCaption: '<strong>@place</strong>',
          description: '**kept**',
          'marker-color': '#123456'
        },
        'gate'
      ),
      metadata: { name: '@place', description: '<p>hidden</p>', creator: 'editor' }
    };
    const line = collection(
      {
        type: 'LineString',
        coordinates: [
          [37, 55],
          [38, 56]
        ]
      },
      {
        description: '# raw',
        stroke: '#fff',
        'stroke-width': '5e-1',
        'stroke-opacity': '0',
        'stroke-dasharray': '5 3'
      }
    );
    const area = collection(
      { type: 'MultiPolygon', coordinates: [polygon, [polygon[0]]] },
      {
        precision: 'approximate',
        stroke: 'red',
        'stroke-dasharray': [3, '2'],
        fill: '#abc',
        'fill-opacity': '0.6'
      }
    );
    const original = JSON.stringify([input, line, area]);
    const result = [input, line, area].map(
      (value) => parseEditorialGeometry(value, 'fixture').features[0]
    );

    expect(JSON.stringify([input, line, area])).toBe(original);
    expect(
      result.map(
        ({ id, geometry, description, iconCaption, strokeWidth, strokeDasharray, precision }) => ({
          id,
          type: geometry.type,
          description,
          iconCaption,
          strokeWidth,
          strokeDasharray,
          precision
        })
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "description": "**kept**",
          "iconCaption": "<strong>@place</strong>",
          "id": "gate",
          "precision": undefined,
          "strokeDasharray": undefined,
          "strokeWidth": undefined,
          "type": "Point",
        },
        {
          "description": "# raw",
          "iconCaption": undefined,
          "id": 0,
          "precision": undefined,
          "strokeDasharray": [
            5,
            3,
          ],
          "strokeWidth": 0.5,
          "type": "LineString",
        },
        {
          "description": undefined,
          "iconCaption": undefined,
          "id": 0,
          "precision": "approximate",
          "strokeDasharray": [
            3,
            2,
          ],
          "strokeWidth": undefined,
          "type": "MultiPolygon",
        },
      ]
    `);
    expect(result[0]?.markerColor).toBe('#123456');
    expect(result[1]?.strokeOpacity).toBe(0);
    expect(result[2]?.fillOpacity).toBe(0.6);
    expect(parseEditorialGeometry(input, 'fixture').metadata).toMatchInlineSnapshot(`
      {
        "creator": "editor",
        "description": "<p>hidden</p>",
        "name": "@place",
      }
    `);
  });

  it.each(['marker-color', 'stroke', 'fill'])(
    'rejects invalid %s colors with source, feature ID and field diagnostics',
    (field) => {
      for (const color of ['not-a-color', '#12', '#gggggg', 'rgb(nope)', 'var(--missing)']) {
        expect(() =>
          parseEditorialGeometry(
            collection({ type: 'Point', coordinates: [37, 55] }, { [field]: color }),
            'news/entry.md map insertion 2'
          )
        ).toThrow(
          `editorial geometry "news/entry.md map insertion 2" is invalid: features.0.properties.${field} [feature 0 (ID 0)]: expected a valid CSS color`
        );
      }
    }
  );

  it.each([
    '#AbC',
    '#1234',
    '#123456',
    '#12345678',
    'red',
    'rgb(20, 30, 40)',
    'hsl(120 50% 25% / .5)'
  ])('preserves valid color %s in all authored color fields', (color) => {
    const feature = parseEditorialGeometry(
      collection(
        { type: 'Point', coordinates: [37, 55] },
        { 'marker-color': color, stroke: color, fill: color }
      ),
      'colors.geojson'
    ).features[0];

    expect(feature).toMatchObject({ markerColor: color, stroke: color, fill: color });
  });

  it('identifies the source, feature index, zero ID and precise field for rejected content', () => {
    expect(() =>
      parseEditorialGeometry(
        collection(
          { type: 'Point', coordinates: [37, 55] },
          {
            undocumented: 'do not drop me'
          }
        ),
        'news/entry.md map #2'
      )
    ).toThrow(/news\/entry\.md map #2.*features\.0\.properties\.undocumented.*feature 0 \(ID 0\)/);
    expect(() =>
      parseEditorialGeometry(
        collection({ type: 'MultiPoint', coordinates: [[37, 55]] }, {}, 'gate'),
        'pond.geojson'
      )
    ).toThrow(/pond\.geojson.*features\.0\.geometry\.type.*feature 0 \(ID "gate"\)/);
    expect(() =>
      parseEditorialGeometry(
        {
          ...collection({ type: 'Point', coordinates: [37, 55] }),
          metadata: { author: 'missing' }
        },
        'metadata.geojson'
      )
    ).toThrow(/metadata\.geojson.*metadata.*author/);
    expect(
      RawEditorialGeometrySchema.safeParse(
        collection(
          { type: 'Point', coordinates: [37, 55] },
          {
            'stroke-width': 'not a number'
          }
        )
      ).success
    ).toBe(false);
    expect(() =>
      parseEditorialGeometry(
        collection(
          { type: 'Point', coordinates: [37, 55] },
          {
            precision: 'approximate',
            outline_expansion_meters: 5
          }
        ),
        'point.geojson'
      )
    ).toThrow(/features\.0\.properties\.outline_expansion_meters/);
  });

  it('expands each approximate MultiPolygon part outward and shrinks each hole independently', () => {
    const source = collection(
      {
        type: 'MultiPolygon',
        coordinates: [
          polygon,
          [
            [
              [38, 56],
              [38.01, 56],
              [38.01, 56.01],
              [38, 56.01],
              [38, 56]
            ]
          ]
        ]
      },
      { precision: 'approximate', outline_expansion_meters: 5 }
    );
    const feature = parseEditorialGeometry(source, 'parts.geojson').features[0];
    if (feature?.geometry.type !== 'MultiPolygon') throw new Error('MultiPolygon missing');
    const [first, second] = feature.geometry.coordinates;
    if (!first || !second) throw new Error('parts missing');
    expect(first[0]?.[0]?.[0]).toBeLessThan(37);
    expect(first[1]?.[0]?.[0]).toBeGreaterThan(37.003);
    const preparedHole = first[1];
    const sourceHole = polygon[1];
    if (!preparedHole || !sourceHole) throw new Error('hole missing');
    expect(
      Math.max(...preparedHole.map(([lng]) => lng)) - Math.min(...preparedHole.map(([lng]) => lng))
    ).toBeLessThan(
      Math.max(...sourceHole.map(([lng]) => lng)) - Math.min(...sourceHole.map(([lng]) => lng))
    );
    expect(second[0]?.[0]?.[0]).toBeLessThan(38);
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(1);
    expect(feature.strokeDasharray).toBeUndefined();
    expect(JSON.stringify(feature)).not.toContain('outline_expansion_meters');
    expect(JSON.stringify(source)).toContain('outline_expansion_meters');
  });

  it('does not turn a fully contracted tiny hole into a larger hole', () => {
    const tiny = [
      [37.005, 55.005],
      [37.00502, 55.005],
      [37.00502, 55.00502],
      [37.005, 55.00502],
      [37.005, 55.005]
    ];
    const feature = parseEditorialGeometry(
      collection(
        { type: 'Polygon', coordinates: [polygon[0], tiny] },
        {
          precision: 'approximate',
          outline_expansion_meters: 5
        }
      ),
      'small-hole.geojson'
    ).features[0];
    if (feature?.geometry.type !== 'Polygon') throw new Error('Polygon missing');

    const preparedHole = feature.geometry.coordinates[1];
    const width = preparedHole
      ? Math.max(...preparedHole.map(([lng]) => lng)) -
        Math.min(...preparedHole.map(([lng]) => lng))
      : 0;
    expect(width).toBeLessThan(0.00002);
    expect(feature.geometry.coordinates).toHaveLength(1);
    expect(RawEditorialGeometrySchema.safeParse(collection(feature.geometry)).success).toBe(true);
  });

  it('rejects a valid source polygon whose prepared coordinates cross the pole', () => {
    const pole = [
      [37, 89.9999],
      [37.00001, 89.9999],
      [37.00001, 89.99998],
      [37, 89.99998],
      [37, 89.9999]
    ];
    const area = collection(
      { type: 'Polygon', coordinates: [pole] },
      {
        precision: 'approximate',
        outline_expansion_meters: 5
      }
    );
    const source = {
      type: 'FeatureCollection',
      features: [
        collection({ type: 'Point', coordinates: [37, 55] }, {}, 1).features[0],
        area.features[0]
      ]
    };
    expect(RawEditorialGeometrySchema.safeParse(source).success).toBe(true);
    expect(() => parseEditorialGeometry(source, 'pole.geojson')).toThrow(
      /pole\.geojson.*feature 1.*ID 0.*geometry\.coordinates\.0\.\d+\.1/
    );
  });
});
