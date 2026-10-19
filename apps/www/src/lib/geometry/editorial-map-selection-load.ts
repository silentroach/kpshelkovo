import { loadMapSelectionSets } from '@/lib/map-selection-sets/load';
import type { EditorialMapSelectionResolver } from '@/lib/markdown/editorial-maps.types';
import { loadParcelsData } from '@/lib/parcels/load';
import { buildParcelMapPayload } from '@/lib/parcels/map-public';
import { loadPlacesData } from '@/lib/places/load';

import { createEditorialMapSelectionResolver } from './editorial-map-selection';

let cache: Promise<EditorialMapSelectionResolver> | undefined;

export const loadEditorialMapSelectionResolver = (): Promise<EditorialMapSelectionResolver> =>
  (cache ??= (async () => {
    const [parcels, places, sets] = await Promise.all([
      loadParcelsData(),
      loadPlacesData(),
      loadMapSelectionSets()
    ]);
    return createEditorialMapSelectionResolver({
      parcels: buildParcelMapPayload(parcels.parcels),
      places: places.places,
      sets
    });
  })());
