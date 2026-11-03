import type { PlaceMapLayerOptions } from './map-types';
import type { PlaceMapLayer } from './schema';
import type { Place } from './types';

export const PLACE_MAP_LAYER_OPTIONS: Readonly<
  Partial<Record<PlaceMapLayer, PlaceMapLayerOptions>>
> = {
  club: { fit: true }
};

/** Publication is decided by showOnMap; this predicate only controls the current map scene. */
export const isPlaceLayerVisible = (
  place: Pick<Place, 'mapLayer'>,
  enabledLayers: readonly PlaceMapLayer[] = []
): boolean => !place.mapLayer || enabledLayers.includes(place.mapLayer);
