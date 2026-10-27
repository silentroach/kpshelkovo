import { toPublicEditorialGeometry } from '@/lib/geometry/editorial-public';

import { mapSelectionSetPublicSchema } from './public-schema';
import type { MapSelectionSetPublicDto } from './public-types';
import type { ResolvedMapSelectionSet } from './types';

export const toMapSelectionSetPublicDto = (
  set: ResolvedMapSelectionSet
): MapSelectionSetPublicDto => {
  const payload = {
    id: set.id,
    parcels: set.parcelCodes,
    places: set.placeSlugs,
    outline: set.outline
  };
  if (set.geometry) {
    return mapSelectionSetPublicSchema.parse({
      ...payload,
      geometry: toPublicEditorialGeometry(set.geometry)
    });
  }
  return mapSelectionSetPublicSchema.parse(payload);
};
