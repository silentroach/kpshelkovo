import polylabel from 'polylabel';

import { fromWebMercator, toWebMercator } from './mercator.ts';
import type { PolygonGeometry, PolygonPosition } from './types.ts';

const PRECISION_M = 0.1;

/** Finds one label position in WGS84, comparing clearance in Web Mercator metres. */
export const polygonLabelCoordinates = (geometry: PolygonGeometry): PolygonPosition => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best: ReturnType<typeof polylabel> | undefined;

  for (const polygon of polygons) {
    const candidate = polylabel(
      polygon.map((ring) =>
        ring.map((position): [number, number] => {
          const [x, y] = toWebMercator(position);
          return [x, y];
        })
      ),
      PRECISION_M
    );
    if (!best || candidate.distance > best.distance) best = candidate;
  }

  if (!best || best.distance <= 0) throw new Error('Polygon has no interior label position');
  return fromWebMercator(best);
};
