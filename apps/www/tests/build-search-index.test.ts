import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

import { PARCEL_PARTS, type ParcelPart } from '../src/lib/parcels/schema';

const script = fileURLToPath(new URL('../scripts/build-search-index.ts', import.meta.url));
const parcel = (part: ParcelPart, code: string) => ({
  code,
  part,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [37, 55],
        [38, 55],
        [37, 56],
        [37, 55]
      ]
    ]
  },
  labelCoordinates: [37.1, 55.1]
});

const failures: readonly {
  readonly name: string;
  readonly missing?: ParcelPart;
  readonly files: Partial<Record<ParcelPart, string>>;
  readonly error: RegExp;
}[] = [
  { name: 'missing file', missing: 'shf', files: {}, error: /shf\.json/u },
  { name: 'unparseable JSON', files: { shf: '{oops' }, error: /shf\.json/u },
  { name: 'invalid payload', files: { shf: '[{}]' }, error: /shf\.json/u },
  {
    name: 'code shared across files',
    files: {
      shf: JSON.stringify([parcel('shf', 'SHF-A1')]),
      shv: JSON.stringify([parcel('shv', 'SHF-A1')])
    },
    error: /Duplicate parcel designation: SHF-A1/u
  },
  {
    name: 'alias colliding with a code in another file',
    files: {
      shf: JSON.stringify([parcel('shf', 'SHF-A1')]),
      shv: JSON.stringify([{ ...parcel('shv', 'SHV-A1'), aliases: ['SHF-A1'] }])
    },
    error: /Duplicate parcel designation: SHF-A1/u
  },
  {
    name: 'aliases shared across files',
    files: {
      shf: JSON.stringify([{ ...parcel('shf', 'SHF-A1'), aliases: ['SHF-A2'] }]),
      shv: JSON.stringify([{ ...parcel('shv', 'SHV-A1'), aliases: ['SHF-A2'] }])
    },
    error: /Duplicate parcel designation: SHF-A2/u
  }
];

it.each(failures)('does not index a $name', async ({ files, missing, error }) => {
  const cwd = await mkdtemp(join(tmpdir(), 'parcel-index-'));
  try {
    const data = join(cwd, 'dist/site/map/data/parcels');
    await mkdir(data, { recursive: true });
    for (const part of PARCEL_PARTS) {
      if (part === missing) continue;
      const content = files[part] ?? '[]';
      await writeFile(join(data, `${part}.json`), content);
    }

    const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(error);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
