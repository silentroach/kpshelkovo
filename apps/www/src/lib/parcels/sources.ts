import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parse as parseYaml } from 'yaml';

import { PARCEL_PARTS } from './schema';
import {
  GenplanSnapshotSchema,
  NspdMetadataSchema,
  ParcelMatchesSchema,
  RawNspdFeatureSchema
} from './source-schemas';
import type { GenplanSnapshots, NspdSnapshot, ConfirmedMatches } from './source-types';

export const readNspdSnapshot = async (directory: string): Promise<NspdSnapshot> => {
  const [metadataText, ndjson] = await Promise.all([
    readFile(join(directory, 'nspd.json'), 'utf8'),
    readFile(join(directory, 'nspd.ndjson'), 'utf8')
  ]);
  const metadata = NspdMetadataSchema.parse(JSON.parse(metadataText));
  const ids = new Set<number>();
  const numbers = new Set<string>();
  const features = ndjson
    .trim()
    .split('\n')
    .map((line, index) => {
      let feature: ReturnType<typeof RawNspdFeatureSchema.parse>;
      try {
        feature = RawNspdFeatureSchema.parse(JSON.parse(line));
      } catch (error) {
        throw new Error(`nspd.ndjson line ${index + 1}: ${String(error)}`, { cause: error });
      }

      if (ids.has(feature.id) || numbers.has(feature.properties.cadastralNumber)) {
        throw new Error(`nspd.ndjson line ${index + 1}: duplicate ID or cadastral number`);
      }
      ids.add(feature.id);
      numbers.add(feature.properties.cadastralNumber);
      return feature;
    });

  if (features.length !== metadata.response.featureCount) {
    throw new Error(
      `nspd.ndjson contains ${features.length} features, expected ${metadata.response.featureCount}`
    );
  }

  return { metadata, features };
};

export const readGenplanSnapshots = async (directory: string): Promise<GenplanSnapshots> =>
  new Map(
    await Promise.all(
      PARCEL_PARTS.map(async (part) => {
        const path = join(directory, 'genplans', `${part}.json`);
        const snapshot = GenplanSnapshotSchema.parse(JSON.parse(await readFile(path, 'utf8')));
        if (snapshot.part !== part)
          throw new Error(`genplan ${path} declares ${snapshot.part}, expected ${part}`);
        return [part, snapshot] as const;
      })
    )
  );

export const readParcelMatches = async (directory: string): Promise<ConfirmedMatches> => {
  const matches = ParcelMatchesSchema.parse(
    parseYaml(await readFile(join(directory, 'matches.yaml'), 'utf8'))
  ).matches;
  const codes = new Set<string>();
  const numbers = new Set<string>();

  for (const match of matches) {
    if (numbers.has(match.cadastral_number)) {
      throw new Error(`duplicate confirmed cadastral number ${match.cadastral_number}`);
    }
    numbers.add(match.cadastral_number);
    for (const code of match.codes) {
      if (codes.has(code)) throw new Error(`duplicate confirmed code ${code}`);
      codes.add(code);
    }
  }

  return matches;
};
