import { union } from 'polyclip-ts';
import polylabel from 'polylabel';

import { fromWebMercator, toWebMercator } from './mercator.ts';
import type { PolygonGeometry, PolygonPosition } from './types.ts';

const PRECISION_M = 0.1;

const isGeometryArray = (
  geometry: PolygonGeometry | readonly PolygonGeometry[]
): geometry is readonly PolygonGeometry[] => Array.isArray(geometry);

/** Finds one label position in WGS84; arrays are unioned before comparing clearance in Mercator. */
export const polygonLabelCoordinates = (
  geometry: PolygonGeometry | readonly PolygonGeometry[]
): PolygonPosition => {
  const merge = isGeometryArray(geometry);
  let polygons = (merge ? geometry : [geometry]).flatMap((part) =>
    part.type === 'Polygon' ? [part.coordinates] : part.coordinates
  );
  if (merge && polygons.length) {
    polygons = union(
      polygons.map((polygon) =>
        polygon.map((ring) => ring.map(([lng, lat]): [number, number] => [lng, lat]))
      )
    );
  }
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
