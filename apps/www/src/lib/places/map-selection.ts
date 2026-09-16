import type { Place } from './types';

export const selectMapPlaces = (places: readonly Place[]): readonly Place[] =>
  places.filter((place) => place.showOnMap);
