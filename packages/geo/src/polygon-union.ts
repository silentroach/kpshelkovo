import { union } from 'polyclip-ts';

import type { PolygonGeometry } from './types.ts';

/** Unions polygon geometries without changing their source coordinates. */
export const unionPolygonGeometries = (geometries: readonly PolygonGeometry[]): PolygonGeometry => {
  const polygons = geometries.flatMap((geometry) =>
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  );

  if (polygons.length === 0) return { type: 'MultiPolygon', coordinates: [] };

  const result = union(
    polygons.map((polygon) => polygon.map((ring) => ring.map(([x, y]): [number, number] => [x, y])))
  );

  return { type: 'MultiPolygon', coordinates: result };
};
