import { loadParcelsData } from '@/lib/parcels/load';
import { loadPlacesData } from '@/lib/places/load';

import { mapRawSelectionSet } from './mapper';
import { toMapSelectionSetPublicDto } from './public';
import type { MapSelectionSetPublicDto } from './public-types';
import { mapSelectionSetRawSchema } from './raw-schema';
import { resolveMapSelectionSets } from './resolver';

const rawFiles = import.meta.glob<string>('../../data/map-selection-sets/*.json', {
  eager: true,
  import: 'default',
  query: '?raw'
});

const mapSelectionSetId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const buildMapSelectionSets = async (
  files: Readonly<Record<string, string>>
): Promise<readonly MapSelectionSetPublicDto[]> => {
  const [parcels, places] = await Promise.all([loadParcelsData(), loadPlacesData()]);
  const definitions = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, source]) => {
      const match = /\/([^/]+)\.json$/.exec(path);
      const id = match?.[1];
      if (!id || !mapSelectionSetId.test(id))
        throw new Error(`invalid map selection set filename "${path}"`);
      let raw;
      try {
        raw = mapSelectionSetRawSchema.parse(JSON.parse(source));
      } catch (cause) {
        throw new Error(`invalid map selection set "${path}": ${String(cause)}`, { cause });
      }
      const parcelCodes = raw.parcels.map((code) => {
        const parcel = parcels.byCode.get(code.toUpperCase());
        if (!parcel)
          throw new Error(`map selection set "${id}" references unknown parcel "${code}"`);
        return parcel.code;
      });
      const placeSlugs = [...new Set(raw.places)];
      for (const slug of placeSlugs) {
        const place = places.bySlug.get(slug);
        if (!place) throw new Error(`map selection set "${id}" references unknown place "${slug}"`);
        if (!place.showOnMap)
          throw new Error(`map selection set "${id}" references hidden place "${slug}"`);
      }
      const domain = mapRawSelectionSet(id, {
        parcels: [...new Set(parcelCodes)].sort(),
        places: placeSlugs,
        sets: raw.sets,
        outline: raw.outline
      });
      return domain;
    });
  return resolveMapSelectionSets(definitions).map(toMapSelectionSetPublicDto);
};

let cache: Promise<readonly MapSelectionSetPublicDto[]> | undefined;
export const loadMapSelectionSets = (): Promise<readonly MapSelectionSetPublicDto[]> =>
  (cache ??= buildMapSelectionSets(rawFiles));

export const loadMapSelectionSet = async (
  id: string
): Promise<MapSelectionSetPublicDto | undefined> =>
  (await loadMapSelectionSets()).find((set) => set.id === id);
