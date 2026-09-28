import { normalizeCoordinate } from '@/lib/geometry/coordinate-precision';

import type { EventCoordinates } from './types';

export const toPublicEventCoordinates = (
  coordinates?: EventCoordinates
): EventCoordinates | undefined =>
  coordinates
    ? { lat: normalizeCoordinate(coordinates.lat), lng: normalizeCoordinate(coordinates.lng) }
    : undefined;
