import { fromWebMercator } from '@shelkovo/geo';

import { roundPosition } from '../geometry/coordinate-precision.ts';
import { RawPolygonGeometrySchema } from '../geometry/raw-polygon-schema.ts';
import type { RawNspdFeature } from './source-schemas';
import type { ParcelGeometry } from './types';

export const projectNspdGeometry = (
  geometry: RawNspdFeature['geometry'],
  source?: string
): ParcelGeometry => {
  const projected =
    geometry.type === 'Polygon'
      ? {
          type: 'Polygon',
          coordinates: geometry.coordinates.map((ring) =>
            ring.map((position) => roundPosition(fromWebMercator(position)))
          )
        }
      : {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) => ring.map((position) => roundPosition(fromWebMercator(position))))
          )
        };
  const result = RawPolygonGeometrySchema.safeParse(projected);
  if (!result.success) {
    throw new Error(`invalid projected geometry from ${source ?? 'NSPD'}: ${result.error.message}`);
  }
  return result.data;
};
