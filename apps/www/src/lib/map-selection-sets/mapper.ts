import { mapEditorialGeometry } from '@/lib/geometry/editorial-mapper';

import type { RawMapSelectionSet } from './raw-schema';
import type { MapSelectionSet } from './types';

export const mapRawSelectionSet = (id: string, raw: RawMapSelectionSet): MapSelectionSet => ({
  id,
  parcelCodes: raw.parcels,
  placeSlugs: raw.places,
  setIds: raw.sets,
  outline: raw.outline,
  geometry: raw.features?.length
    ? mapEditorialGeometry(
        { type: 'FeatureCollection', features: raw.features },
        `map selection set "${id}"`
      )
    : undefined
});
