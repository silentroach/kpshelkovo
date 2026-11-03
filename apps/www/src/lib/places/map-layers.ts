import type { PlaceMapLayer } from './schema';
import type { Place } from './types';

/** Publication is decided by showOnMap; this predicate only controls the current map scene. */
export const isPlaceLayerVisible = (
  place: Pick<Place, 'mapLayer'>,
  enabledLayers: readonly PlaceMapLayer[] = []
): boolean => !place.mapLayer || enabledLayers.includes(place.mapLayer);
