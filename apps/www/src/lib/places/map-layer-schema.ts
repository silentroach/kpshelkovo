import { z } from 'zod';

import { RoadMapPublicSchema } from '@/lib/roads/map-public-schema';

import { PlaceMapPublicPayloadSchema } from './map-public-schema';
import { PLACE_MAP_LAYERS, PLACE_SLUG } from './schema';

export const PlaceMapBasePayloadSchema = PlaceMapPublicPayloadSchema.extend({
  placeLayers: z.record(z.string().regex(PLACE_SLUG), z.enum(PLACE_MAP_LAYERS))
});

export const PlaceMapInfraPayloadSchema = PlaceMapPublicPayloadSchema.extend({
  roads: RoadMapPublicSchema
});
