import { describe, expect, it } from 'vitest';

import { buildParcelsDataset } from '../load';
import { RawParcelSchema } from '../raw-schema';
import { parcelRecordPath, parcelSourceId } from '../source';
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
  id: parcelRecordPath(code).slice(0, -3),
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
      dataset.parcels.map(({ code, aliases, part, cadastralParts, areaM2, status, body }) => ({
        code,
        aliases,
        part,
        cadastralNumber: cadastralParts[0]?.cadastralNumber,
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
    expect(dataset.parcels[0]?.cadastralParts[0]?.geometry).toEqual(geometry);
    expect(dataset.byCode.get('SHR-L44')).toBe(dataset.byCode.get('SHR-L43'));
  });

  it('rejects paths that do not match the primary code', () => {
    expect(parcelSourceId('shr/l/l43.md')).toBe('shr/l/l43');
    expect(() => parcelSourceId('shr/l43.md')).toThrow('parcel path');
    expect(() => parcelSourceId('shr/m/l43.md')).toThrow('parcel path');
    expect(() => parcelSourceId('shr/L/l43.md')).toThrow('parcel path');
    expect(() => buildParcelsDataset([{ ...entry(), id: 'shr/l/l44' }])).toThrow(
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

  it('indexes every cadastral part of a group without inventing a group number or partial area', () => {
    const parts = [
      { cadastral_number: '50:33:0010101:3385', geometry, area_m2: 500 },
      { cadastral_number: '50:33:0010101:3386', geometry, area_m2: 500 }
    ];
    const group = {
      ...entry('SHR-E35'),
      data: RawParcelSchema.parse({ code: 'SHR-E35', cadastral_parts: parts })
    };
    const dataset = buildParcelsDataset([group]);
    expect(dataset.parcels[0]?.areaM2).toBe(1000);
    expect([...dataset.byCadastralNumber.keys()]).toEqual(
      parts.map((part) => part.cadastral_number)
    );
    expect(dataset.byCadastralNumber.get(parts[1]!.cadastral_number)).toBe(dataset.parcels[0]);
    expect(dataset.parcels[0]).not.toHaveProperty('cadastralNumber');
    expect(
      buildParcelsDataset([
        {
          ...group,
          data: RawParcelSchema.parse({
            code: 'SHR-E35',
            cadastral_parts: parts.map(({ area_m2: _, ...part }) => part)
          })
        }
      ]).parcels[0]?.areaM2
    ).toBeUndefined();
    expect(() =>
      buildParcelsDataset([group, entry('SHR-L43', parts[1]!.cadastral_number)])
    ).toThrow('parcel cadastral number');
  });

  it('accepts MultiPolygon and optional area without fabricating a status', () => {
    const parcel = RawParcelSchema.parse({
      ...entry().data,
      geometry: { type: 'MultiPolygon', coordinates: [geometry.coordinates] },
      area_m2: 2150
    });
    expect(parcel.geometry?.type).toBe('MultiPolygon');
    expect(buildParcelsDataset([{ ...entry(), data: parcel }]).parcels[0]?.areaM2).toBe(2150);
    expect(parcel.status).toBeUndefined();
  });

  it('keeps the parcel polygon boundary strict when editorial geometries include points and lines', () => {
    expect(
      RawParcelSchema.safeParse({
        ...entry().data,
        geometry: { type: 'Point', coordinates: [37.74, 55.05] }
      }).success
    ).toBe(false);
    expect(
      RawParcelSchema.safeParse({
        ...entry().data,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [37, 55],
              [38, 55],
              [38, 56],
              [37, 56]
            ]
          ]
        }
      }).success
    ).toBe(false);
  });
});
