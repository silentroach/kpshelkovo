import {
  ParcelMapPublicSchema,
  ParcelSearchPublicSchema,
  type ParcelMapPublicDto,
  type ParcelSearchPublicDto
} from './map-public-schema';
import type { Parcel, ParcelGeometry } from './types';

const labelCoordinates = (geometry: ParcelGeometry): readonly [number, number] => {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  for (const polygon of polygons) {
    for (const [longitude, latitude] of polygon[0] ?? []) {
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
    }
  }

  return [(west + east) / 2, (south + north) / 2];
};

export const buildParcelMapPayload = (parcels: readonly Parcel[]): ParcelMapPublicDto =>
  ParcelMapPublicSchema.parse({
    parcels: parcels.map((parcel) => ({
      code: parcel.code,
      aliases: parcel.aliases,
      part: parcel.part,
      geometry: parcel.geometry,
      labelCoordinates: labelCoordinates(parcel.geometry)
    }))
  });

export const buildParcelSearchPayload = (parcels: readonly Parcel[]): ParcelSearchPublicDto =>
  ParcelSearchPublicSchema.parse({
    parcels: parcels.map((parcel) => ({
      code: parcel.code,
      aliases: parcel.aliases,
      part: parcel.part
    }))
  });
