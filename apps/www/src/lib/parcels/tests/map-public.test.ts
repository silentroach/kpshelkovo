import { toWebMercator } from '@shelkovo/geo';
import { describe, expect, it } from 'vitest';

import { buildParcelMapPayload } from '../map-public';
import { ParcelMapPublicSchema } from '../map-public-schema';
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
      payload.map(({ code, aliases }) => ({
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
    const label = payload[0]?.labelCoordinates;
    expect(label?.[0]).toBeGreaterThan(37.02);
    expect(label?.[0]).toBeLessThan(37.03);
    expect(label?.[1]).toBeGreaterThan(55.02);
    expect(label?.[1]).toBeLessThan(55.03);
    expect(payload[0]?.geometry).toEqual(parcel.geometry);
    expect(Object.keys(payload[0] ?? {}).sort()).toMatchInlineSnapshot(`
      [
        "aliases",
        "code",
        "geometry",
        "labelCoordinates",
        "part",
        "status",
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
    expect(shifted[0]?.geometry.type).toBe('MultiPolygon');
    const original = unchanged[0]?.geometry;
    const moved = shifted[0]?.geometry;
    if (original?.type !== 'MultiPolygon' || moved?.type !== 'MultiPolygon')
      throw new Error('MultiPolygon missing');
    expect(moved.coordinates.map((polygon) => polygon.map((ring) => ring.length))).toEqual(
      original.coordinates.map((polygon) => polygon.map((ring) => ring.length))
    );
    const a = original.coordinates[0]?.[0]?.[0];
    const b = moved.coordinates[0]?.[0]?.[0];
    const labelA = unchanged[0]?.labelCoordinates;
    const labelB = shifted[0]?.labelCoordinates;
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

  it('omits empty aliases while keeping every ring of Polygon and MultiPolygon', () => {
    const coordinates =
      parcel.geometry.type === 'MultiPolygon'
        ? parcel.geometry.coordinates[0]
        : parcel.geometry.coordinates;
    if (!coordinates) throw new Error('polygon missing');
    const single = {
      ...parcel,
      code: 'SHR-L45',
      aliases: [],
      geometry: { type: 'Polygon' as const, coordinates }
    };
    const payload = buildParcelMapPayload([parcel, single], {
      offset_east_m: 0,
      offset_north_m: 0
    });
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[1]?.aliases).toBeUndefined();
    expect(payload[1]?.geometry).toEqual(single.geometry);
    expect(payload[0]?.geometry).toEqual(parcel.geometry);
    expect(ParcelMapPublicSchema.safeParse({ parcels: payload }).success).toBe(false);
  });

  it('publishes only the known sale status without inventing one for unknown parcels', () => {
    const config = { offset_east_m: 0, offset_north_m: 0 };
    const payload = buildParcelMapPayload(
      (['available', 'reserved', 'sold', 'unavailable', undefined] as const).map(
        (status, index) => ({ ...parcel, code: `SHR-L${43 + index}`, status })
      ),
      config
    );
    expect(payload.map(({ code, status }) => ({ code, status }))).toMatchInlineSnapshot(`
      [
        {
          "code": "SHR-L43",
          "status": "available",
        },
        {
          "code": "SHR-L44",
          "status": "reserved",
        },
        {
          "code": "SHR-L45",
          "status": "sold",
        },
        {
          "code": "SHR-L46",
          "status": "unavailable",
        },
        {
          "code": "SHR-L47",
          "status": undefined,
        },
      ]
    `);
    expect(payload[4]).not.toHaveProperty('status');
  });
});
