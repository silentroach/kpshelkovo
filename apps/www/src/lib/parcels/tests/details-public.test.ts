import type { APIContext } from 'astro';
import { describe, expect, it, vi } from 'vitest';

import { GET, getStaticPaths } from '@/pages/map/data/parcels/details/[code].json';

import { buildParcelDetailsPayload } from '../details-public';
import { ParcelDetailsPublicSchema } from '../details-public-schema';
import { loadParcelsData } from '../load';
import { mapRawParcel } from '../mapper';
import { RawParcelSchema } from '../raw-schema';
import { parcelRecordPath } from '../source';
import type { Parcel } from '../types';

vi.mock('../load', () => ({ loadParcelsData: vi.fn() }));

const geometry = {
  type: 'Polygon',
  coordinates: [
    [
      [37.74, 55.05],
      [37.75, 55.05],
      [37.75, 55.06],
      [37.74, 55.05]
    ]
  ]
} as const;

const parcel = (code: string, data: Record<string, unknown>): Parcel =>
  mapRawParcel({
    id: parcelRecordPath(code).slice(0, -3),
    body: 'Редакционная заметка',
    data: RawParcelSchema.parse({ code, ...data })
  });

const cadastral = { cadastral_number: '50:33:0010101:2998', geometry };

describe('parcel public details', () => {
  it('keeps every observation in source order, including same-day changes and a return to an earlier price', () => {
    const source = parcel('SHR-L43', {
      ...cadastral,
      aliases: ['SHR-L44'],
      status: 'available',
      area_m2: 1250,
      features: ['meadow'],
      price_history: [
        { on: '2026-09-01', price: 9000000 },
        { on: '2026-09-01', price: 8000000 },
        { on: '2026-09-02', price: 9000000 }
      ]
    });

    expect(buildParcelDetailsPayload(source)).toMatchInlineSnapshot(`
      {
        "areaM2": 1250,
        "code": "SHR-L43",
        "part": "shr",
        "priceHistory": [
          {
            "on": "2026-09-01",
            "price": 9000000,
          },
          {
            "on": "2026-09-01",
            "price": 8000000,
          },
          {
            "on": "2026-09-02",
            "price": 9000000,
          },
        ],
        "status": "available",
      }
    `);
  });

  it('publishes a composite area only when every cadastral part has an area', () => {
    const parts = [
      { cadastral_number: '50:33:0010101:3385', geometry, area_m2: 500 },
      { cadastral_number: '50:33:0010101:3386', geometry, area_m2: 750 }
    ];
    const complete = buildParcelDetailsPayload(
      parcel('SHR-E35', { cadastral_parts: parts, status: 'reserved' })
    );
    const partial = buildParcelDetailsPayload(
      parcel('SHR-E36', {
        cadastral_parts: [parts[0], { cadastral_number: parts[1]!.cadastral_number, geometry }],
        status: 'reserved'
      })
    );

    expect({ complete, partial }).toMatchInlineSnapshot(`
      {
        "complete": {
          "areaM2": 1250,
          "code": "SHR-E35",
          "part": "shr",
          "priceHistory": [],
          "status": "reserved",
        },
        "partial": {
          "areaM2": undefined,
          "code": "SHR-E36",
          "part": "shr",
          "priceHistory": [],
          "status": "reserved",
        },
      }
    `);
    expect(JSON.stringify(partial)).not.toContain('areaM2');
  });

  it('rejects a malformed final public payload at the adapter boundary', () => {
    const source = parcel('SHR-L43', { ...cadastral, status: 'available' });
    expect(() =>
      buildParcelDetailsPayload({ ...source, priceHistory: [{ on: 'bad', price: 0 }] })
    ).toThrow();
  });

  it('generates compact JSON for primary available and reserved codes only', async () => {
    const parcels = [
      parcel('SHR-L43', {
        aliases: ['SHR-L44'],
        status: 'available',
        cadastral_parts: [
          { cadastral_number: '50:33:0010101:3385', geometry, area_m2: 500 },
          { cadastral_number: '50:33:0010101:3386', geometry, area_m2: 750 }
        ],
        price_history: [
          { on: '2026-09-01', price: 9000000 },
          { on: '2026-09-01', price: 8000000 },
          { on: '2026-09-02', price: 9000000 }
        ]
      }),
      parcel('SHR-L45', {
        ...cadastral,
        cadastral_number: '50:33:0010101:2999',
        status: 'reserved'
      }),
      parcel('SHR-L46', { ...cadastral, cadastral_number: '50:33:0010101:3000', status: 'sold' }),
      parcel('SHR-L47', {
        ...cadastral,
        cadastral_number: '50:33:0010101:3001',
        status: 'unavailable'
      }),
      parcel('SHR-L48', { ...cadastral, cadastral_number: '50:33:0010101:3002' })
    ];
    vi.mocked(loadParcelsData).mockResolvedValue({
      parcels,
      byCode: new Map(
        parcels.flatMap((entry) => [entry.code, ...entry.aliases].map((code) => [code, entry]))
      ),
      byCadastralNumber: new Map()
    });

    const paths = await getStaticPaths();
    expect(paths.map(({ params }) => params)).toMatchInlineSnapshot(`
      [
        {
          "code": "SHR-L43",
        },
        {
          "code": "SHR-L45",
        },
      ]
    `);
    for (const path of paths) {
      const response = await GET({ props: path.props } as APIContext<{ body: string }>);
      const text = await response.text();
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(ParcelDetailsPublicSchema.parse(JSON.parse(text)).code).toBe(path.params.code);
      expect(text).toBe(JSON.stringify(JSON.parse(text)));
      expect(text).not.toMatch(/aliases|geometry|cadastral|features|body|notes/);
    }
    expect(JSON.parse(paths[0]!.props.body)).toMatchObject({ areaM2: 1250 });
    expect(JSON.parse(paths[0]!.props.body).priceHistory).toEqual(parcels[0]!.priceHistory);
    expect(JSON.parse(paths[1]!.props.body)).toMatchObject({
      priceHistory: [],
      status: 'reserved'
    });
  });
});
