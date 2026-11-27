import { z } from 'zod';

import { RoadMapPublicSchema } from '@/lib/roads/map-public-schema';

import { PlaceMapPublicPayloadSchema } from './map-public-schema';
import { PLACE_MAP_LAYERS, PLACE_SLUG } from './schema';

export const PlaceMapBasePayloadSchema = PlaceMapPublicPayloadSchema.extend({
  placeLayers: z.partialRecord(z.enum(PLACE_MAP_LAYERS), z.array(z.string().regex(PLACE_SLUG)))
});

export const PlaceMapLayerPayloadSchema = PlaceMapPublicPayloadSchema.extend({
  roads: RoadMapPublicSchema.optional()
});
