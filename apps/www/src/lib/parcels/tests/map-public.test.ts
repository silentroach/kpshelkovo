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
    const payload = buildParcelMapPayload([parcel]);

    expect(ParcelMapPublicSchema.safeParse(payload).success).toBe(true);
    expect(
      payload.parcels.map(({ code, aliases, labelCoordinates }) => ({
        code,
        aliases,
        labelCoordinates
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "aliases": [
            "SHR-L44",
          ],
          "code": "SHR-L43",
          "labelCoordinates": [
            37.015,
            55.015,
          ],
        },
      ]
    `);
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
