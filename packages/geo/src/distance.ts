import dist from '@turf/distance';

/**
 * Calculates distance between two coordinates in kilometers.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return dist([lng1, lat1], [lng2, lat2], { units: 'kilometers' });
}
