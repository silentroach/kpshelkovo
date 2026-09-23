import polylabel from 'polylabel';

import type { PolygonGeometry, PolygonPosition } from './types';

const EARTH_RADIUS_M = 6_378_137;
const RADIANS = Math.PI / 180;
const PRECISION_M = 0.1;

const project = ([lng, lat]: PolygonPosition): [number, number] => [
  EARTH_RADIUS_M * lng * RADIANS,
  EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (lat * RADIANS) / 2))
];

const unproject = ([x, y]: PolygonPosition): PolygonPosition => [
  x / EARTH_RADIUS_M / RADIANS,
  Math.atan(Math.sinh(y / EARTH_RADIUS_M)) / RADIANS
];

/** Finds one label position in WGS84, comparing clearance in Web Mercator metres. */
export const polygonLabelCoordinates = (geometry: PolygonGeometry): PolygonPosition => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best: ReturnType<typeof polylabel> | undefined;

  for (const polygon of polygons) {
    const candidate = polylabel(
      polygon.map((ring) => ring.map(project)),
      PRECISION_M
    );
    if (!best || candidate.distance > best.distance) best = candidate;
  }

  if (!best || best.distance <= 0) throw new Error('Polygon has no interior label position');
  return unproject(best);
};
