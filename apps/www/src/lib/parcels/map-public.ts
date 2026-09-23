import {
  ParcelMapPublicSchema,
  ParcelSearchPublicSchema,
  type ParcelMapPublicDto,
  type ParcelSearchPublicDto
} from './map-public-schema';
import type { Parcel } from './types';

const DisplayConfigSchema = z
  .object({ offset_east_m: z.number(), offset_north_m: z.number() })
  .strict();
const offset = DisplayConfigSchema.parse(parseYaml(displayConfig));

export const buildParcelMapPayload = (
  parcels: readonly Parcel[],
  config = offset
): ParcelMapPublicDto => {
  const positions = parcels.flatMap((parcel) =>
    parcel.geometry.type === 'Polygon'
      ? parcel.geometry.coordinates.flat()
      : parcel.geometry.coordinates.flat(2)
  );
  const referenceLatitude = positions.length
    ? (Math.min(...positions.map(([, lat]) => lat)) +
        Math.max(...positions.map(([, lat]) => lat))) /
      2
    : 0;
  const shift = createDisplayOffset(config.offset_east_m, config.offset_north_m, referenceLatitude);

  return ParcelMapPublicSchema.parse(
    parcels.map((parcel) => ({
      code: parcel.code,
      ...(parcel.aliases.length ? { aliases: parcel.aliases } : {}),
      part: parcel.part,
      muted: parcel.status !== 'sold',
      geometry:
        parcel.geometry.type === 'Polygon'
          ? {
              type: 'Polygon',
              coordinates: parcel.geometry.coordinates.map((ring) => ring.map(shift))
            }
          : {
              type: 'MultiPolygon',
              coordinates: parcel.geometry.coordinates.map((polygon) =>
                polygon.map((ring) => ring.map(shift))
              )
            },
      labelCoordinates: shift(polygonLabelCoordinates(parcel.geometry))
    }))
  );
};

export const buildParcelSearchPayload = (parcels: readonly Parcel[]): ParcelSearchPublicDto =>
  ParcelSearchPublicSchema.parse({
    parcels: parcels.map((parcel) => ({
      code: parcel.code,
      aliases: parcel.aliases,
      part: parcel.part
    }))
  });
import { createDisplayOffset, polygonLabelCoordinates } from '@shelkovo/geo';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import displayConfig from '@/config/parcel-map.yaml?raw';
