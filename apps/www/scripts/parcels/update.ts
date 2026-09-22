import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mapGenplanSnapshot } from '../../src/lib/parcels/genplan-mapper.ts';
import { parseGenplanPage } from '../../src/lib/parcels/genplan-page.ts';
import { reconcileParcels } from '../../src/lib/parcels/reconcile.ts';
import { PARCEL_PARTS } from '../../src/lib/parcels/schema.ts';
import type { GenplanSnapshots } from '../../src/lib/parcels/source-types.ts';
import {
  readGenplanSnapshots,
  readNspdSnapshot,
  readParcelMatches
} from '../../src/lib/parcels/sources.ts';
import {
  writeAtomic,
  writeParcelUpdate,
  readSavedParcels
} from '../../src/lib/parcels/update-files.ts';
import { formatParcelUpdate } from '../../src/lib/parcels/update-report.ts';

const sourceDir = fileURLToPath(new URL('../../src/data/parcel-sources/', import.meta.url));
const recordsDir = fileURLToPath(new URL('../../src/data/parcels/', import.meta.url));
const pages = {
  shr: 'https://dgtime.ru/shr/shr-genplan/',
  shf: 'https://dgtime.ru/shf/shf-genplan/',
  shp: 'https://dgtime.ru/shp/shp-genplan/',
  shv: 'https://dgtime.ru/shv/shv-genplan/'
} as const;

const acquireGenplans = async (): Promise<GenplanSnapshots> =>
  new Map(
    await Promise.all(
      PARCEL_PARTS.map(async (part) => {
        const page = pages[part];
        const response = await fetch(page, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`${page}: HTTP ${response.status}`);
        const html = await response.text();
        const capturedAt = new Date().toISOString();
        return [part, parseGenplanPage(html, part, page, capturedAt)] as const;
      })
    )
  );

const acceptedText = async (file: string): Promise<string | undefined> =>
  readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });

const main = async (): Promise<void> => {
  const [mode, flag, directory] = process.argv.slice(2);
  if (
    (mode !== 'genplans' && mode !== 'nspd') ||
    (flag !== undefined && (flag !== '--snapshot' || !directory)) ||
    (mode === 'nspd' && !directory) ||
    process.argv.length > (directory ? 5 : 3)
  ) {
    throw new Error(
      'Usage: pnpm parcels:update genplans [--snapshot <directory>] | nspd --snapshot <directory>'
    );
  }
  const input = directory ? resolve(process.cwd(), directory) : undefined;
  const genplans =
    mode === 'genplans'
      ? input
        ? await readGenplanSnapshots(input)
        : await acquireGenplans()
      : await readGenplanSnapshots(sourceDir);
  const nspd = mode === 'nspd' ? await readNspdSnapshot(input!) : await readNspdSnapshot(sourceDir);
  const matches = await readParcelMatches(sourceDir);
  const previous = await readSavedParcels(recordsDir);
  const acceptedFiles =
    mode === 'genplans'
      ? (await readdir(`${sourceDir}/genplans`)).filter((file) => file.endsWith('.json'))
      : [];
  if (acceptedFiles.length !== 0 && acceptedFiles.length !== PARCEL_PARTS.length)
    throw new Error(
      'incomplete accepted genplan batch; restore the source files and records from Git'
    );
  const acceptedGenplans =
    mode === 'genplans' && acceptedFiles.length ? await readGenplanSnapshots(sourceDir) : undefined;
  if (acceptedGenplans) {
    for (const part of PARCEL_PARTS) {
      const old = acceptedGenplans.get(part);
      const next = genplans.get(part);
      if (old && next && Date.parse(next.capturedAt) < Date.parse(old.capturedAt))
        throw new Error(
          `${part}: snapshot ${next.capturedAt} predates accepted ${old.capturedAt}; use Git to roll back`
        );
    }
  }
  if (mode === 'nspd') {
    const accepted = await readNspdSnapshot(sourceDir);
    if (nspd.metadata.capturedOn < accepted.metadata.capturedOn)
      throw new Error('cadastral snapshot predates the accepted snapshot; use Git to roll back');
    if (
      !nspd.metadata.response.coverageVerified &&
      (await readFile(`${input}/nspd.ndjson`, 'utf8')) !==
        (await readFile(`${sourceDir}/nspd.ndjson`, 'utf8'))
    )
      throw new Error('verify the new cadastral response coverage before accepting deletions');
  }

  const mapped = PARCEL_PARTS.map((part) => {
    const snapshot = genplans.get(part);
    if (!snapshot) throw new Error(`missing genplan ${part}`);
    return mapGenplanSnapshot(snapshot);
  });
  const update = reconcileParcels(mapped, nspd, matches, previous);
  // Validate the complete result before touching any accepted file.
  console.log(formatParcelUpdate(update, nspd));
  if (mode === 'genplans') {
    for (const part of PARCEL_PARTS) {
      const file = `${sourceDir}/genplans/${part}.json`;
      const text = `${JSON.stringify(genplans.get(part), undefined, 2)}\n`;
      if ((await acceptedText(file)) !== text) await writeAtomic(file, text);
    }
  } else {
    for (const file of ['nspd.json', 'nspd.ndjson']) {
      const text = await readFile(`${input}/${file}`, 'utf8');
      if ((await acceptedText(`${sourceDir}/${file}`)) !== text)
        await writeAtomic(`${sourceDir}/${file}`, text);
    }
  }
  await writeParcelUpdate(recordsDir, update);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
