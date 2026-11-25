import type { RoadMapPublicDto } from '@/lib/roads/map-public-schema';

import type { PlaceMapBasePayloadDto, PlaceMapLayerPayloadDto } from './map-layer-dto';
import { PlaceMapBasePayloadSchema, PlaceMapLayerPayloadSchema } from './map-layer-schema';
import { toPublicPlace } from './map-public';
import { selectMapPlaces } from './map-selection';
import type { PlaceMapLayer } from './schema';
import type { Place } from './types';

export const buildPlaceMapBasePayload = (places: readonly Place[]): PlaceMapBasePayloadDto => {
  const visible = selectMapPlaces(places);
  const placeLayers: Record<PlaceMapLayer, string[]> = { infra: [], club: [] };
  for (const { slug, mapLayer } of visible) {
    if (mapLayer) {
      placeLayers[mapLayer].push(slug);
    }
  }

  return PlaceMapBasePayloadSchema.parse({
    places: visible.filter(({ mapLayer }) => !mapLayer).map(toPublicPlace),
    placeLayers
  });
};

export const buildPlaceMapLayerPayload = (
  places: readonly Place[],
  layer: PlaceMapLayer,
  roads?: Readonly<RoadMapPublicDto>
): PlaceMapLayerPayloadDto =>
  PlaceMapLayerPayloadSchema.parse({
    places: selectMapPlaces(places)
      .filter(({ mapLayer }) => mapLayer === layer)
      .map(toPublicPlace),
    roads
  });
