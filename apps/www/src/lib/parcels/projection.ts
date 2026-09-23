import { fromWebMercator } from '@shelkovo/geo';

import { RawPolygonGeometrySchema } from '../geometry/raw-polygon-schema.ts';
import type { RawNspdFeature } from './source-schemas';
import type { ParcelGeometry } from './types';

export const projectNspdGeometry = (geometry: RawNspdFeature['geometry']): ParcelGeometry =>
  RawPolygonGeometrySchema.parse(
    geometry.type === 'Polygon'
      ? {
          type: 'Polygon',
          coordinates: geometry.coordinates.map((ring) => ring.map(fromWebMercator))
        }
      : {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) => ring.map(fromWebMercator))
          )
        }
  );
