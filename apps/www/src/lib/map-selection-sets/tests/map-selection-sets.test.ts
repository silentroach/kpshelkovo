import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/parcels/load', () => ({
  loadParcelsData: async () => ({
    byCode: new Map([
      ['SHP-A1', { code: 'SHP-A1' }],
      ['SHP-A2', { code: 'SHP-A1' }]
    ])
  })
}));
vi.mock('@/lib/places/load', () => ({
  loadPlacesData: async () => ({
    bySlug: new Map([
      ['visible', { showOnMap: true }],
      ['hidden', { showOnMap: false }]
    ])
  })
}));

import { buildMapSelectionSets } from '../load';
import { resolveMapSelectionSets } from '../resolver';

const point = {
  type: 'Feature',
  properties: { iconContent: '19', iconCaption: 'Finish', 'marker-color': '#123456' },
  geometry: { type: 'Point', coordinates: [37.123456789, 55.123456789] }
};
const line = {
  type: 'Feature',
  properties: { stroke: '#654321', 'stroke-width': '4' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [37, 55],
      [37.123456789, 55.123456789]
    ]
  }
};

describe('map selection sets loader', () => {
  it('prepares and publishes only the definition’s own numbered geometry, not nested geometry', async () => {
    const result = await buildMapSelectionSets({
      '/sets/child.json': JSON.stringify({ parcels: ['SHP-A2'], features: [point, line] }),
      '/sets/parent.json': JSON.stringify({ sets: ['child'] }),
      '/sets/own.json': JSON.stringify({ sets: ['child'], features: [line] }),
      '/sets/empty-features.json': JSON.stringify({ places: ['visible'], features: [] })
    });
    expect(result.find((set) => set.id === 'child')).toMatchInlineSnapshot(`
      {
        "geometry": {
          "features": [
            {
              "geometry": {
                "coordinates": [
                  37.12345679,
                  55.12345679,
                ],
                "type": "Point",
              },
              "id": undefined,
              "properties": {
                "captionOnly": undefined,
                "description": undefined,
                "fill": undefined,
                "fill-opacity": undefined,
                "iconCaption": "Finish",
                "iconContent": "19",
                "marker-color": "#123456",
                "precision": undefined,
                "stroke": undefined,
                "stroke-dasharray": undefined,
                "stroke-opacity": undefined,
                "stroke-width": undefined,
              },
              "type": "Feature",
            },
            {
              "geometry": {
                "coordinates": [
                  [
                    37,
                    55,
                  ],
                  [
                    37.12345679,
                    55.12345679,
                  ],
                ],
                "type": "LineString",
              },
              "id": undefined,
              "properties": {
                "captionOnly": undefined,
                "description": undefined,
                "fill": undefined,
                "fill-opacity": undefined,
                "iconCaption": undefined,
                "iconContent": undefined,
                "marker-color": undefined,
                "precision": undefined,
                "stroke": "#654321",
                "stroke-dasharray": undefined,
                "stroke-opacity": undefined,
                "stroke-width": 4,
              },
              "type": "Feature",
            },
          ],
          "metadata": undefined,
          "type": "FeatureCollection",
        },
        "id": "child",
        "outline": false,
        "parcels": [
          "SHP-A1",
        ],
        "places": [],
      }
    `);
    expect(result.find((set) => set.id === 'parent')).toMatchInlineSnapshot(`
      {
        "id": "parent",
        "outline": false,
        "parcels": [
          "SHP-A1",
        ],
        "places": [],
      }
    `);
    expect(result.find((set) => set.id === 'own')?.geometry?.features).toHaveLength(1);
    expect(Object.keys(result.find((set) => set.id === 'empty-features')!)).not.toContain(
      'geometry'
    );
  });

  it.each([
    ['features without members', { features: [point] }, /must not be empty/],
    [
      'invalid coordinate',
      {
        places: ['visible'],
        features: [{ ...point, geometry: { type: 'Point', coordinates: [181, 55] } }]
      },
      /features.*coordinates/s
    ],
    [
      'invalid properties',
      { places: ['visible'], features: [{ ...point, properties: { iconContent: '01' } }] },
      /features.*iconContent/s
    ],
    [
      'polygon',
      {
        places: ['visible'],
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [37, 55],
                  [38, 55],
                  [38, 56],
                  [37, 55]
                ]
              ]
            }
          }
        ]
      },
      /only Point and LineString/
    ],
    [
      'short line',
      {
        places: ['visible'],
        features: [{ ...line, geometry: { type: 'LineString', coordinates: [[37, 55]] } }]
      },
      /features.*coordinates/s
    ]
  ])('rejects %s with the set source and geometry field', async (_name, input, message) => {
    const result = buildMapSelectionSets({ '/sets/bad.json': JSON.stringify(input) });
    await expect(result).rejects.toThrow(/bad.json/);
    await expect(result).rejects.toThrow(message);
  });

  it('resolves aliases, deduplicates canonical positions, and validates compact public payload', async () => {
    const result = await buildMapSelectionSets({
      '/sets/sample.json': JSON.stringify({
        parcels: ['shp-a2', 'SHP-A1'],
        places: ['visible', 'visible'],
        outline: true
      })
    });
    expect(JSON.stringify(result[0])).toMatchInlineSnapshot(`
      "{\"id\":\"sample\",\"parcels\":[\"SHP-A1\"],\"places\":[\"visible\"],\"outline\":true}"
    `);
    expect(result[0]).toMatchInlineSnapshot(`
      {
        "id": "sample",
        "outline": true,
        "parcels": [
          "SHP-A1",
        ],
        "places": [
          "visible",
        ],
      }
    `);
  });

  it.each([
    ['unknown parcel', '{"parcels":["SHP-Z999"]}', /unknown parcel/],
    ['unknown place', '{"places":["missing"]}', /unknown place/],
    ['hidden place', '{"places":["hidden"]}', /hidden place/],
    ['empty set', '{}', /must not be empty/],
    ['invalid JSON', '{', /bad.json/],
    ['unknown field', '{"coordinates":[]}', /bad.json/]
  ])('rejects %s', async (_name, source, message) => {
    await expect(buildMapSelectionSets({ '/sets/bad.json': source })).rejects.toThrow(message);
  });

  it('resolves nested mixed sets, shared children and canonical duplicates without inheriting outline', async () => {
    const result = await buildMapSelectionSets({
      '/sets/root.json': JSON.stringify({ parcels: ['SHP-A2'], sets: ['left', 'right'] }),
      '/sets/left.json': JSON.stringify({ parcels: ['SHP-A1'], sets: ['shared'], outline: true }),
      '/sets/right.json': JSON.stringify({ places: ['visible'], sets: ['shared'] }),
      '/sets/shared.json': JSON.stringify({ parcels: ['SHP-A2'] })
    });
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "id": "left",
          "outline": true,
          "parcels": [
            "SHP-A1",
          ],
          "places": [],
        },
        {
          "id": "right",
          "outline": false,
          "parcels": [
            "SHP-A1",
          ],
          "places": [
            "visible",
          ],
        },
        {
          "id": "root",
          "outline": false,
          "parcels": [
            "SHP-A1",
          ],
          "places": [
            "visible",
          ],
        },
        {
          "id": "shared",
          "outline": false,
          "parcels": [
            "SHP-A1",
          ],
          "places": [],
        },
      ]
    `);
  });

  it.each([
    [
      'unknown reference',
      [{ id: 'root', parcelCodes: [], placeSlugs: [], setIds: ['missing'], outline: false }],
      /chain: root -> missing/
    ],
    [
      'direct cycle',
      [{ id: 'root', parcelCodes: [], placeSlugs: [], setIds: ['root'], outline: false }],
      /root -> root/
    ],
    [
      'indirect cycle',
      [
        { id: 'root', parcelCodes: [], placeSlugs: [], setIds: ['child'], outline: false },
        { id: 'child', parcelCodes: ['SHP-A1'], placeSlugs: [], setIds: ['root'], outline: false }
      ],
      /root -> child -> root/
    ],
    [
      'empty resolved child',
      [
        { id: 'root', parcelCodes: ['SHP-A1'], placeSlugs: [], setIds: ['empty'], outline: false },
        { id: 'empty', parcelCodes: [], placeSlugs: [], setIds: [], outline: false }
      ],
      /empty set/
    ]
  ])('rejects %s with chain diagnostics', (_name, definitions, message) => {
    expect(() => resolveMapSelectionSets(definitions)).toThrow(message);
  });
});
