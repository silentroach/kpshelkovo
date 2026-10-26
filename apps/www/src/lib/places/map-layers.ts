import type { Place } from './types';

/** Publication is decided by showOnMap; this predicate only controls the current map scene. */
export const isPlaceLayerVisible = (
  place: Pick<Place, 'mapLayer'>,
  infrastructureEnabled = false
): boolean => place.mapLayer !== 'infrastructure' || infrastructureEnabled;
