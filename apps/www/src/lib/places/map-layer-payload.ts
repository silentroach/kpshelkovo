import type { RoadMapPublicDto } from '@/lib/roads/map-public-schema';

import type { PlaceMapBasePayloadDto, PlaceMapInfraPayloadDto } from './map-layer-dto';
import { PlaceMapBasePayloadSchema, PlaceMapInfraPayloadSchema } from './map-layer-schema';
import { toPublicPlace } from './map-public';
import type { PlaceMapPublicPayloadDto } from './map-public-dto';
import { PlaceMapPublicPayloadSchema } from './map-public-schema';
import { selectMapPlaces } from './map-selection';
import type { Place } from './types';

export const buildPlaceMapBasePayload = (places: readonly Place[]): PlaceMapBasePayloadDto => {
  const visible = selectMapPlaces(places);
  return PlaceMapBasePayloadSchema.parse({
    places: visible.filter(({ mapLayer }) => !mapLayer).map(toPublicPlace),
    placeLayers: Object.fromEntries(
      visible.flatMap(({ slug, mapLayer }) => (mapLayer ? [[slug, mapLayer] as const] : []))
    )
  });
};

export const buildPlaceMapInfraPayload = (
  places: readonly Place[],
  roads: RoadMapPublicDto
): PlaceMapInfraPayloadDto =>
  PlaceMapInfraPayloadSchema.parse({
    places: selectMapPlaces(places)
      .filter(({ mapLayer }) => mapLayer === 'infra')
      .map(toPublicPlace),
    roads
  });

export const buildPlaceMapClubPayload = (places: readonly Place[]): PlaceMapPublicPayloadDto =>
  PlaceMapPublicPayloadSchema.parse({
    places: selectMapPlaces(places)
      .filter(({ mapLayer }) => mapLayer === 'club')
      .map(toPublicPlace)
  });
