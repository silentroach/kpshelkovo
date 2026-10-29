import { describe, expect, it } from 'vitest';

import type { MapSelectionSetPublicDto } from '@/lib/map-selection-sets/public-types';
import type { EditorialMapSelection } from '@/lib/markdown/editorial-maps.types';
import { buildParcelMapPayload } from '@/lib/parcels/map-public';
import type { Parcel } from '@/lib/parcels/types';

import { createEditorialMapSelectionResolver } from '../editorial-map-selection';
import type { EditorialMapSelectionSources } from '../editorial-map-selection.types';

const geometry = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [37, 55],
        [37.01, 55],
        [37.01, 55.01],
        [37, 55.01],
        [37, 55]
      ]
    ],
    [
      [
        [37.01, 55],
        [37.02, 55],
        [37.02, 55.01],
        [37.01, 55.01],
        [37.01, 55]
      ]
    ]
  ]
} as const;
const parcel = {
  code: 'SHP-A1',
  aliases: ['SHP-A2'],
  part: 'shp',
  geometry,
  labelCoordinates: [37.005, 55.005],
  multipleCadastralParcels: true,
  status: 'reserved',
  area: 1000,
  price: 123456
} as const;
const sources: EditorialMapSelectionSources = {
  parcels: [parcel],
  places: [
    {
      slug: 'ponds',
      name: 'Пруды',
      showOnMap: true,
      coordinates: { lng: 37.03, lat: 55.03 },
      geometry: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [37.025, 55.025] },
            iconCaption: 'Вход'
          },
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [37.025, 55.025],
                [37.03, 55.03]
              ]
            }
          },
          { type: 'Feature', geometry }
        ]
      }
    },
    {
      slug: 'hidden',
      name: 'Скрытое место',
      showOnMap: false,
      coordinates: { lng: 37, lat: 55 }
    }
  ],
  sets: [{ id: 'group', parcels: ['SHP-A1'], places: ['ponds'], outline: true }]
};
const selection: EditorialMapSelection = {
  sets: ['group'],
  parcels: ['shp-a2'],
  places: ['ponds'],
  outline: false
};

describe('editorial map selection resolver', () => {
  it('imports only directly referenced prepared set geometry once without recoloring or renumbering', () => {
    const child: MapSelectionSetPublicDto = {
      id: 'child',
      parcels: ['SHP-A1'],
      places: [],
      outline: false,
      geometry: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { iconContent: '19', 'marker-color': '#123456' },
            geometry: { type: 'Point', coordinates: [37.12345678, 55.12345678] }
          }
        ]
      }
    };
    const parent: MapSelectionSetPublicDto = {
      id: 'parent',
      parcels: ['SHP-A1'],
      places: [],
      outline: false
    };
    const resolve = createEditorialMapSelectionResolver({
      parcels: [parcel],
      places: [],
      sets: [parent, child]
    });
    expect(
      resolve({ sets: ['parent'], parcels: [], places: [], outline: false }, 'parent').geometry
        .features
    ).toHaveLength(1);
    const result = resolve(
      { sets: ['parent', 'child', 'child'], parcels: [], places: [], outline: false },
      'mixed'
    );
    expect(result.geometry.features).toHaveLength(2);
    expect(result.geometry.features[1]).toMatchInlineSnapshot(`
      {
        "captionOnly": undefined,
        "captionPosition": undefined,
        "description": undefined,
        "fill": undefined,
        "fillOpacity": undefined,
        "geometry": {
          "coordinates": [
            37.12345678,
            55.12345678,
          ],
          "type": "Point",
        },
        "iconCaption": undefined,
        "iconContent": "19",
        "id": undefined,
        "markerColor": "#123456",
        "precision": undefined,
        "stroke": undefined,
        "strokeDasharray": undefined,
        "strokeOpacity": undefined,
        "strokeWidth": undefined,
        "type": "Feature",
      }
    `);
  });

  it('deduplicates a compound parcel and retains every place geometry without commercial data', () => {
    const result = createEditorialMapSelectionResolver(sources)(selection, 'test map 1');
    expect(result.geometry.features.map((feature) => feature.geometry.type)).toMatchInlineSnapshot(`
      [
        "MultiPolygon",
        "Point",
        "Point",
        "LineString",
        "MultiPolygon",
      ]
    `);
    expect(result.geometry.features[0]?.geometry).toEqual(parcel.geometry);
    expect(result.parcelLabels).toMatchInlineSnapshot(`
      [
        {
          "coordinates": [
            37.005,
            55.005,
          ],
          "text": "A1/A2",
        },
      ]
    `);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/"(?:price|area|status)"/);
    expect(result.geometry.features[1]?.iconCaption).toBe('Пруды');
    // The referenced set requested an outline, but the block itself did not.
    expect(result.geometry.features).toHaveLength(5);
  });

  it('builds the casing from parcels only, without changing the source geometry', () => {
    const before = JSON.stringify(sources);
    const result = createEditorialMapSelectionResolver(sources)(
      { ...selection, outline: true },
      'test map 2'
    );
    expect(result.geometry.features).toHaveLength(7);
    const outline = result.geometry.features.at(-1)!;
    expect(outline.geometry).toMatchInlineSnapshot(`
      {
        "coordinates": [
          [
            [
              [
                37,
                55,
              ],
              [
                37.02,
                55,
              ],
              [
                37.02,
                55.01,
              ],
              [
                37,
                55.01,
              ],
              [
                37,
                55,
              ],
            ],
          ],
        ],
        "type": "MultiPolygon",
      }
    `);
    expect(JSON.stringify(sources)).toBe(before);
  });

  it.each([
    { sets: ['missing'], parcels: [], places: [], outline: false },
    { sets: [], parcels: ['SHP-A99'], places: [], outline: false },
    { sets: [], parcels: [], places: ['missing'], outline: false },
    { sets: [], parcels: [], places: ['hidden'], outline: false }
  ])('rejects unresolved or hidden references with the insertion context: %j', (input) => {
    expect(() =>
      createEditorialMapSelectionResolver(sources)(input, 'article map insertion 3')
    ).toThrow(/article map insertion 3.*(?:unknown|hidden)/);
  });

  it('uses the full prepared payload even when one selected parcel has a different latitude extent', () => {
    const first: Parcel = {
      code: 'SHP-A1',
      aliases: [],
      part: 'shp',
      cadastralParts: [{ cadastralNumber: '50:01:0000000:1', geometry }],
      features: [],
      priceHistory: [],
      body: ''
    };
    const other: Parcel = {
      ...first,
      code: 'SHP-A3',
      cadastralParts: [
        {
          cadastralNumber: '50:01:0000000:3',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [37, 56],
                [37.01, 56],
                [37.01, 56.01],
                [37, 56.01],
                [37, 56]
              ]
            ]
          }
        }
      ]
    };
    const prepared = buildParcelMapPayload([first, other], {
      offset_east_m: 20,
      offset_north_m: 10
    });
    const result = createEditorialMapSelectionResolver({ parcels: prepared, places: [], sets: [] })(
      {
        sets: [],
        parcels: [first.code],
        places: [],
        outline: false
      },
      'map'
    );
    expect(result.geometry.features[0]?.geometry).toEqual(prepared[0]?.geometry);
    expect(result.geometry.features[0]?.geometry).not.toEqual(
      buildParcelMapPayload([first], { offset_east_m: 20, offset_north_m: 10 })[0]?.geometry
    );
  });
});
