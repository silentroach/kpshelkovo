import {
  ParcelMapPublicSchema,
  ParcelSearchPublicSchema,
  type ParcelMapPublicDto,
  type ParcelSearchPublicDto
} from './map-public-schema';
import type { Parcel } from './types';

export const buildParcelMapPayload = (parcels: readonly Parcel[]): ParcelMapPublicDto =>
  ParcelMapPublicSchema.parse({
    parcels: parcels.map((parcel) => ({
      code: parcel.code,
      aliases: parcel.aliases,
      part: parcel.part,
      geometry: parcel.geometry,
      labelCoordinates: polygonLabelCoordinates(parcel.geometry)
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
import { polygonLabelCoordinates } from '@shelkovo/geo';
