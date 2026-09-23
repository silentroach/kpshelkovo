import { z } from 'astro/zod';

import { RawPolygonGeometrySchema } from '@/lib/geometry/raw-polygon-schema';

const areaFeature = z
  .object({
    type: z.literal('Feature'),
    id: z.literal('area'),
    properties: z
      .object({
        kind: z.literal('area'),
        precision: z.literal('approximate'),
        outline_expansion_meters: z.number().positive().max(25).optional()
      })
      .strict(),
    geometry: RawPolygonGeometrySchema
  })
  .strict();

export const RawPlaceGeometrySchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.tuple([areaFeature])
  })
  .strict();

export type RawPlaceGeometry = z.output<typeof RawPlaceGeometrySchema>;
