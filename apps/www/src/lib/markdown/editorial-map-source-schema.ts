import { z } from 'zod';

import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';

const references = z.array(z.string().trim().min(1)).default([]);

/** Markdown-only input: never widen the raw .geojson contract for places. */
export const EditorialMapSourceSchema = z.strictObject({
  type: z.literal('FeatureCollection').optional(),
  sets: references,
  parcels: references,
  places: references,
  outline: z.boolean().default(false),
  metadata: RawEditorialGeometrySchema.shape.metadata,
  features: z.array(RawEditorialGeometrySchema.shape.features.element).default([])
});

export const EditorialMapSourceKindSchema = z.looseObject({
  type: z.unknown().optional(),
  sets: z.unknown().optional(),
  parcels: z.unknown().optional(),
  places: z.unknown().optional(),
  outline: z.unknown().optional()
});
