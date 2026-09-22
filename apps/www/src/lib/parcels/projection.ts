import { RawPolygonGeometrySchema } from '../geometry/raw-polygon-schema.ts';
import type { RawNspdFeature } from './source-schemas';
import type { ParcelGeometry, ParcelPosition } from './types';

const EARTH_RADIUS_M = 6_378_137;
const DEGREES = 180 / Math.PI;

const toWgs84 = ([x, y]: readonly [number, number]): ParcelPosition => [
  (x / EARTH_RADIUS_M) * DEGREES,
  (2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) * DEGREES
];

export const projectNspdGeometry = (geometry: RawNspdFeature['geometry']): ParcelGeometry =>
  RawPolygonGeometrySchema.parse(
    geometry.type === 'Polygon'
      ? { type: 'Polygon', coordinates: geometry.coordinates.map((ring) => ring.map(toWgs84)) }
      : {
          type: 'MultiPolygon',
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) => ring.map(toWgs84))
          )
        }
  );
