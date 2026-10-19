import { mapSelectionSetPublicSchema } from './public-schema';
import type { MapSelectionSetPublicDto } from './public-types';
import type { ResolvedMapSelectionSet } from './types';

export const toMapSelectionSetPublicDto = (
  set: ResolvedMapSelectionSet
): MapSelectionSetPublicDto =>
  mapSelectionSetPublicSchema.parse({
    id: set.id,
    parcels: set.parcelCodes,
    places: set.placeSlugs,
    outline: set.outline
  });
