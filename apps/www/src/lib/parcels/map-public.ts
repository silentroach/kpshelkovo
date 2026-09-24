import { createDisplayOffset, polygonLabelCoordinates } from '@shelkovo/geo';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import displayConfig from '@/config/parcel-map.yaml?raw';

import { ParcelMapPublicSchema, type ParcelMapPublicDto } from './map-public-schema';
import type { Parcel, ParcelGeometry } from './types';

const DisplayConfigSchema = z
  .object({ offset_east_m: z.number(), offset_north_m: z.number() })
  .strict();
const offset = DisplayConfigSchema.parse(parseYaml(displayConfig));

const mapGeometry = (parcel: Parcel): ParcelGeometry => {
  if (parcel.cadastralParts.length === 1) return parcel.cadastralParts[0]!.geometry;
  return {
    type: 'MultiPolygon',
    coordinates: parcel.cadastralParts.flatMap(({ geometry }) =>
      geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    )
  };
};

export const buildParcelMapPayload = (
  parcels: readonly Parcel[],
  config = offset
): ParcelMapPublicDto => {
  const positions = parcels.flatMap((parcel) =>
    parcel.cadastralParts.flatMap(({ geometry }) =>
      geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2)
    )
  );
  const referenceLatitude = positions.length
    ? (Math.min(...positions.map(([, lat]) => lat)) +
        Math.max(...positions.map(([, lat]) => lat))) /
      2
    : 0;
  const shift = createDisplayOffset(config.offset_east_m, config.offset_north_m, referenceLatitude);

  return ParcelMapPublicSchema.parse(
    parcels.map((parcel) => {
      const geometry = mapGeometry(parcel);
      return {
        code: parcel.code,
        ...(parcel.aliases.length ? { aliases: parcel.aliases } : {}),
        part: parcel.part,
        ...(parcel.status ? { status: parcel.status } : {}),
        ...(parcel.cadastralParts.length > 1 ? { multipleCadastralParcels: true } : {}),
        geometry:
          geometry.type === 'Polygon'
            ? {
                type: 'Polygon',
                coordinates: geometry.coordinates.map((ring) => ring.map(shift))
              }
            : {
                type: 'MultiPolygon',
                coordinates: geometry.coordinates.map((polygon) =>
                  polygon.map((ring) => ring.map(shift))
                )
              },
        labelCoordinates: shift(polygonLabelCoordinates(geometry))
      };
    })
  );
};
