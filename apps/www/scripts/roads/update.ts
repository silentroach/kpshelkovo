import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { compareRoadSnapshots } from '../../src/lib/roads/compare.ts';
import { mapOverpassRoads, mapRoadSnapshot } from '../../src/lib/roads/mapper.ts';
import { OVERPASS_ENDPOINT } from '../../src/lib/roads/osm.ts';
import type { RoadBounds, RoadSnapshot } from '../../src/lib/roads/types.ts';

const candidateFile = fileURLToPath(new URL('../../../../.cache/roads/osm.json', import.meta.url));
const acceptedFile = fileURLToPath(
  new URL('../../src/data/road-sources/osm.json', import.meta.url)
);
const bounds: RoadBounds = [55.048, 37.701, 55.077, 37.758];

const readSnapshot = async (file: string): Promise<RoadSnapshot | undefined> => {
  const text = await readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (text === undefined) return;
  return mapRoadSnapshot(JSON.parse(text));
};

const writeSnapshot = async (file: string, snapshot: RoadSnapshot): Promise<void> => {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, undefined, 2)}\n`, { flag: 'wx' });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
};

export const acquireRoadSnapshot = async (fetcher = fetch): Promise<RoadSnapshot> => {
  const query = `[out:json][timeout:25];way[highway](${bounds.join(',')});(._;node(w););out body;`;
  const url = new URL(OVERPASS_ENDPOINT);
  url.searchParams.set('data', query);
  const response = await fetcher(url, {
    headers: { 'User-Agent': 'kpshelkovo-road-snapshots/1.0 (+https://kpshelkovo.online/)' },
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`Overpass: HTTP ${response.status}`);
  return mapOverpassRoads(await response.json(), bounds, new Date().toISOString());
};

export const updateRoadSnapshot = async (
  output: { readonly accepted: string; readonly candidate: string },
  input?: string,
  fetcher?: typeof fetch
) => {
  const candidate = input ? await readSnapshot(input) : await acquireRoadSnapshot(fetcher);
  if (!candidate) throw new Error(`No road snapshot at ${input}`);
  const accepted = await readSnapshot(output.accepted);
  const changes = compareRoadSnapshots(candidate, accepted);
  if (!input) {
    await writeSnapshot(output.candidate, candidate);
  } else if (JSON.stringify(accepted) !== JSON.stringify(candidate)) {
    await writeSnapshot(output.accepted, candidate);
  }
  return { changes, bounds: candidate.bounds, previousBounds: accepted?.bounds };
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({ options: { snapshot: { type: 'string' } } });
  const { changes, bounds, previousBounds } = await updateRoadSnapshot(
    { accepted: acceptedFile, candidate: candidateFile },
    values.snapshot ? resolve(values.snapshot) : undefined
  );
  if (previousBounds && previousBounds.join(',') !== bounds.join(',')) {
    console.log(`Bounds: ${previousBounds.join(',')} -> ${bounds.join(',')}`);
  } else {
    console.log(`Bounds: ${bounds.join(',')}`);
  }
  for (const [operation, ids] of Object.entries(changes)) {
    console.log(`${operation} (${ids.length})${ids.length ? `: ${ids.join(', ')}` : ''}`);
  }
  console.log(values.snapshot ? `Accepted: ${acceptedFile}` : `Candidate: ${candidateFile}`);
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
