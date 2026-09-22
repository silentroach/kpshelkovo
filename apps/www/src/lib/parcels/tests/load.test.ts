import { describe, expect, it } from 'vitest';

import { buildParcelsDataset } from '../load';
import { RawParcelSchema } from '../raw-schema';
import { parcelSourceId } from '../source';
import type { ParcelEntry } from '../types';

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

const entry = (
  code = 'SHR-L43',
  cadastralNumber = '50:33:0010101:2998',
  aliases: readonly string[] = []
): ParcelEntry => ({
  id: code.toLowerCase().replace('-', '/'),
  body: 'Заметка **редактора**.\n',
  data: RawParcelSchema.parse({
    code,
    aliases,
    cadastral_number: cadastralNumber,
    geometry
  })
});

describe('parcel dataset', () => {
  it('keeps one current geometry for the primary code and alias, with no invented status or area', () => {
    const dataset = buildParcelsDataset([entry('SHR-L43', '50:33:0010101:2998', ['SHR-L44'])]);

    expect(
      dataset.parcels.map(({ code, aliases, part, cadastralNumber, areaM2, status, body }) => ({
        code,
        aliases,
        part,
        cadastralNumber,
        areaM2,
        status,
        body
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "aliases": [
            "SHR-L44",
          ],
          "areaM2": undefined,
          "body": "Заметка **редактора**.
      ",
          "cadastralNumber": "50:33:0010101:2998",
          "code": "SHR-L43",
          "part": "shr",
          "status": undefined,
        },
      ]
    `);
    expect(dataset.parcels[0]?.geometry).toEqual(geometry);
    expect(dataset.byCode.get('SHR-L44')).toBe(dataset.byCode.get('SHR-L43'));
  });

  it('rejects paths that do not match the primary code', () => {
    expect(() => parcelSourceId('shr/l43/extra.md')).toThrow('parcel path');
    expect(() => parcelSourceId('shr/L43.md')).toThrow('parcel path');
    expect(() => buildParcelsDataset([{ ...entry(), id: 'shr/l44' }])).toThrow(
      'does not match primary code'
    );
  });

  it('reports a code conflict across primary codes and aliases', () => {
    expect(() =>
      buildParcelsDataset([
        entry('SHR-L43', '50:33:0010101:2998', ['SHR-L44']),
        entry('SHR-L44', '50:33:0010101:2999')
      ])
    ).toThrow('parcel code "SHR-L44" conflicts between "SHR-L43" and "SHR-L44"');
  });

  it('reports a cadastral-number conflict across separate files', () => {
    expect(() =>
      buildParcelsDataset([entry('SHR-L43'), entry('SHR-L45', '50:33:0010101:2998')])
    ).toThrow('parcel cadastral number "50:33:0010101:2998" conflicts');
  });

  it('accepts MultiPolygon and optional area without fabricating a status', () => {
    const parcel = RawParcelSchema.parse({
      ...entry().data,
      geometry: { type: 'MultiPolygon', coordinates: [geometry.coordinates] },
      area_m2: 2150
    });
    expect(parcel.geometry.type).toBe('MultiPolygon');
    expect(buildParcelsDataset([{ ...entry(), data: parcel }]).parcels[0]?.areaM2).toBe(2150);
    expect(parcel.status).toBeUndefined();
  });
});
