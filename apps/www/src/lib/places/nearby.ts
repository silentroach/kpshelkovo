import { calculateDistance } from '@shelkovo/geo';

import type { Place } from './types';

export const getNearbyPlaces = (place: Place, places: readonly Place[]): readonly Place[] =>
  places
    .filter((candidate) => candidate.showOnMap && candidate.slug !== place.slug)
    .map((candidate) => ({
      place: candidate,
      distance: calculateDistance(
        place.coordinates.lat,
        place.coordinates.lng,
        candidate.coordinates.lat,
        candidate.coordinates.lng
      )
    }))
    .filter(({ distance }) => distance <= 1)
    .sort((a, b) => a.distance - b.distance || a.place.slug.localeCompare(b.place.slug))
    .slice(0, 3)
    .map(({ place }) => place);
