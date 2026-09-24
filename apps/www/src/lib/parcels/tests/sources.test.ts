import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { projectNspdGeometry } from '../projection';
import { PARCEL_PARTS } from '../schema';
import {
  GenplanSnapshotSchema,
  ParcelMatchesSchema,
  RawNspdFeatureSchema
} from '../source-schemas';
import { readGenplanSnapshots, readNspdSnapshot, readParcelMatches } from '../sources';

const sources = new URL('../../../data/parcel-sources/', import.meta.url).pathname;

describe('parcel sources', () => {
  it('loads the accepted cadastral snapshot as EPSG:3857 without dropping polygon rings', async () => {
    const snapshot = await readNspdSnapshot(sources);
    expect(snapshot.features.length).toBe(snapshot.metadata.response.featureCount);
    expect(snapshot.metadata.geometryCrs).toBe('EPSG:3857');
    expect(
      snapshot.features.every((feature) => feature.geometry.crs.properties.name === 'EPSG:3857')
    ).toBe(true);

    // Проверяем оба вида геометрии на всех кольцах принятого снимка, без постоянного счётчика записей.
    for (const feature of snapshot.features) {
      const projected = projectNspdGeometry(feature.geometry);
      const originalPolygons =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      const projectedPolygons =
        projected.type === 'Polygon' ? [projected.coordinates] : projected.coordinates;
      expect(projectedPolygons.map((polygon) => polygon.map((ring) => ring.length))).toEqual(
        originalPolygons.map((polygon) => polygon.map((ring) => ring.length))
      );
    }
  });

  it('projects outer rings, holes, and every MultiPolygon member without dropping vertices', () => {
    const square = [
      [4_200_000, 7_370_000],
      [4_200_100, 7_370_000],
      [4_200_100, 7_370_100],
      [4_200_000, 7_370_000]
    ];
    const hole = [
      [4_200_020, 7_370_020],
      [4_200_030, 7_370_020],
      [4_200_030, 7_370_030],
      [4_200_020, 7_370_020]
    ];
    const feature = RawNspdFeatureSchema.parse({
      type: 'Feature',
      id: 123,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[square, hole], [square]],
        crs: { type: 'name', properties: { name: 'EPSG:3857' } }
      },
      properties: { cadastralNumber: '50:33:0010101:2998', status: 'Учтенный' }
    });
    const projected = projectNspdGeometry(feature.geometry);
    if (projected.type !== 'MultiPolygon') throw new Error('lost MultiPolygon');
    expect(projected.coordinates.map((polygon) => polygon.map((ring) => ring.length)))
      .toMatchInlineSnapshot(`
      [
        [
          4,
          4,
        ],
        [
          4,
        ],
      ]
    `);
    expect(projected.coordinates[0]?.[0]?.[0]?.[0]).toBeCloseTo(37.7297, 3);
    expect(projected.coordinates[0]?.[0]?.[0]?.[1]).toBeCloseTo(55.04, 1);
  });

  it('loads both documented confirmations, original references, and their evidence', async () => {
    const matches = await readParcelMatches(sources);
    expect(
      matches
        .filter(({ codes }) => codes.includes('SHR-L43') || codes.includes('SHF-V43'))
        .map(({ codes, cadastral_number, source_cadastral_references, primary_code }) => ({
          codes,
          cadastral_number,
          source_cadastral_references,
          primary_code
        }))
    ).toMatchInlineSnapshot(`
      [
        {
          "cadastral_number": "50:33:0010101:2998",
          "codes": [
            "SHR-L43",
            "SHR-L44",
          ],
          "primary_code": "SHR-L43",
          "source_cadastral_references": {
            "SHR-L43": "50:33:0010101:2222",
            "SHR-L44": "50:33:0010101:2221",
          },
        },
        {
          "cadastral_number": "50:33:0010101:2842",
          "codes": [
            "SHF-V43",
          ],
          "primary_code": undefined,
          "source_cadastral_references": {
            "SHF-V43": "50:33:0010101:2842 (был 50:33:0010101:1598)",
          },
        },
      ]
    `);
    expect(matches.every(({ evidence }) => evidence.length > 0)).toBe(true);
  });

  it('requires an explicit source reference for each code and accepts only the absent marker or a string', () => {
    const entry = {
      codes: ['SHR-L43', 'SHR-L44'],
      cadastral_number: '50:33:0010101:2998',
      source_cadastral_references: {
        'SHR-L43': '50:33:0010101:2222',
        'SHR-L44': { absent: true }
      },
      evidence: 'Проверено по источникам'
    };
    const parse = (source_cadastral_references: Record<string, unknown>) =>
      ParcelMatchesSchema.safeParse({
        matches: [{ ...entry, source_cadastral_references }]
      }).success;

    expect(parse(entry.source_cadastral_references)).toBe(true);
    expect(parse({ 'SHR-L43': '50:33:0010101:2222', 'SHR-L44': '' })).toBe(true);
    expect(parse({ 'SHR-L43': '50:33:0010101:2222' })).toBe(false);
    expect(parse({ 'SHR-L43': '50:33:0010101:2222', 'SHR-L44': { absent: false } })).toBe(false);
    expect(
      parse({ 'SHR-L43': '50:33:0010101:2222', 'SHR-L44': { absent: true, note: 'extra' } })
    ).toBe(false);
  });

  it('rejects duplicate confirmed codes and cadastral contours across groups', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-matches-'));
    const entry = (code: string, number: string) =>
      `  - codes: [${code}]\n    cadastral_number: '${number}'\n    source_cadastral_references:\n      ${code}: { absent: true }\n    evidence: Проверено\n`;
    try {
      for (const duplicate of [
        entry('SHR-L43', '50:33:0010101:2999'),
        entry('SHR-L44', '50:33:0010101:2998')
      ]) {
        await writeFile(
          join(directory, 'matches.yaml'),
          `matches:\n${entry('SHR-L43', '50:33:0010101:2998')}${duplicate}`
        );
        await expect(readParcelMatches(directory)).rejects.toThrow('duplicate confirmed');
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects incomplete and contradictory saved genplan snapshots', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-sources-'));
    try {
      await mkdir(join(directory, 'genplans'));
      const sample = (part: string) =>
        JSON.stringify({
          part,
          page: `https://example.org/${part}/`,
          capturedAt: '2026-09-22T12:00:00+03:00',
          plots: [
            {
              id: 'А43',
              cadastralReference: '50:33:0010101:2998',
              status: 'Свободен',
              location: 'луговой',
              objectprice: 1000000
            }
          ]
        });
      for (const part of PARCEL_PARTS) {
        await writeFile(join(directory, 'genplans', `${part}.json`), sample(part));
      }
      expect((await readGenplanSnapshots(directory)).size).toBe(PARCEL_PARTS.length);
      await writeFile(join(directory, 'genplans', 'shv.json'), sample('shr'));
      await expect(readGenplanSnapshots(directory)).rejects.toThrow('expected shv');
      expect(
        GenplanSnapshotSchema.safeParse({ ...JSON.parse(sample('shr')), plots: [] }).success
      ).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects an unsupported CRS before interpreting raw coordinates', async () => {
    const line = (await readFile(join(sources, 'nspd.ndjson'), 'utf8')).split('\n')[0];
    const sample = RawNspdFeatureSchema.parse(JSON.parse(line ?? ''));
    expect(
      RawNspdFeatureSchema.safeParse({
        ...sample,
        geometry: {
          ...sample.geometry,
          crs: { type: 'name', properties: { name: 'EPSG:4326' } }
        }
      }).success
    ).toBe(false);
  });
});
