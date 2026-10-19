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

describe('map selection sets loader', () => {
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
