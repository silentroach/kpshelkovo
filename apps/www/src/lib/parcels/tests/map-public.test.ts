import { toWebMercator } from '@shelkovo/geo';
import { describe, expect, it } from 'vitest';

import { buildParcelMapPayload, buildParcelSearchPayload } from '../map-public';
import { ParcelMapPublicSchema, ParcelSearchPublicSchema } from '../map-public-schema';
import type { Parcel } from '../types';

const parcel: Parcel = {
  code: 'SHR-L43',
  aliases: ['SHR-L44'],
  part: 'shr',
  cadastralNumber: '50:33:0000000:43',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [37, 55],
          [37.01, 55],
          [37.01, 55.01],
          [37, 55]
        ]
      ],
      [
        [
          [37.02, 55.02],
          [37.03, 55.02],
          [37.03, 55.03],
          [37.02, 55.02]
        ]
      ]
    ]
  },
  areaM2: 1500,
  status: 'available',
  features: ['meadow'],
  priceHistory: [{ on: '2026-09-22', price: 9000000 }],
  body: 'Редакционная заметка'
};

describe('parcel public payloads', () => {
  it('publishes one geometry and one label for the current parcel without editorial fields', () => {
    const payload = buildParcelMapPayload([parcel], { offset_east_m: 0, offset_north_m: 0 });

    expect(ParcelMapPublicSchema.safeParse(payload).success).toBe(true);
    expect(
      payload.parcels.map(({ code, aliases }) => ({
        code,
        aliases
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "aliases": [
            "SHR-L44",
          ],
          "code": "SHR-L43",
        },
      ]
    `);
    const label = payload.parcels[0]?.labelCoordinates;
    expect(label?.[0]).toBeGreaterThan(37.02);
    expect(label?.[0]).toBeLessThan(37.03);
    expect(label?.[1]).toBeGreaterThan(55.02);
    expect(label?.[1]).toBeLessThan(55.03);
    expect(payload.parcels[0]?.geometry).toEqual(parcel.geometry);
    expect(Object.keys(payload.parcels[0] ?? {}).sort()).toMatchInlineSnapshot(`
      [
        "aliases",
        "code",
        "geometry",
        "labelCoordinates",
        "part",
      ]
    `);
  });

  it('shifts all rings and the label together from source coordinates without changing the source', () => {
    const source = JSON.stringify(parcel);
    const unchanged = buildParcelMapPayload([parcel], { offset_east_m: 0, offset_north_m: 0 });
    const shifted = buildParcelMapPayload([parcel], { offset_east_m: 5.2, offset_north_m: 3.3 });
    const again = buildParcelMapPayload([parcel], { offset_east_m: 5.2, offset_north_m: 3.3 });
    expect(shifted).toEqual(again);
    expect(JSON.stringify(parcel)).toBe(source);
    expect(parcel.areaM2).toBe(1500);
    expect(shifted.parcels[0]?.geometry.type).toBe('MultiPolygon');
    const original = unchanged.parcels[0]?.geometry;
    const moved = shifted.parcels[0]?.geometry;
    if (original?.type !== 'MultiPolygon' || moved?.type !== 'MultiPolygon')
      throw new Error('MultiPolygon missing');
    expect(moved.coordinates.map((polygon) => polygon.map((ring) => ring.length))).toEqual(
      original.coordinates.map((polygon) => polygon.map((ring) => ring.length))
    );
    const a = original.coordinates[0]?.[0]?.[0];
    const b = moved.coordinates[0]?.[0]?.[0];
    const labelA = unchanged.parcels[0]?.labelCoordinates;
    const labelB = shifted.parcels[0]?.labelCoordinates;
    if (!a || !b || !labelA || !labelB) throw new Error('coordinates missing');
    const [vertexX, vertexY] = toWebMercator(b);
    const [sourceX, sourceY] = toWebMercator(a);
    const [labelX, labelY] = toWebMercator(labelB);
    const [sourceLabelX, sourceLabelY] = toWebMercator(labelA);
    expect(vertexX - sourceX).toBeCloseTo(labelX - sourceLabelX, 4);
    expect(vertexY - sourceY).toBeCloseTo(labelY - sourceLabelY, 4);
    expect(b[0]).toBeGreaterThan(a[0]);
    expect(b[1]).toBeGreaterThan(a[1]);
  });

  it('publishes an exact-search dictionary without coordinates or commercial data', () => {
    const payload = buildParcelSearchPayload([parcel]);

    expect(ParcelSearchPublicSchema.safeParse(payload).success).toBe(true);
    expect(payload).toMatchInlineSnapshot(`
      {
        "parcels": [
          {
            "aliases": [
              "SHR-L44",
            ],
            "code": "SHR-L43",
            "part": "shr",
          },
        ],
      }
    `);
    expect(ParcelSearchPublicSchema.safeParse(buildParcelMapPayload([parcel])).success).toBe(false);
  });
});
