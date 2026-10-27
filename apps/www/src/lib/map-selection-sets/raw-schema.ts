import { z } from 'zod';

import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';

const selectionFeature = RawEditorialGeometrySchema.shape.features.element.refine(
  (feature) => feature.geometry.type === 'Point' || feature.geometry.type === 'LineString',
  { path: ['geometry', 'type'], message: 'selection sets support only Point and LineString' }
);

export const mapSelectionSetRawSchema = z
  .object({
    parcels: z.array(z.string()).optional().default([]),
    places: z.array(z.string()).optional().default([]),
    sets: z.array(z.string()).optional().default([]),
    features: z.array(selectionFeature).optional(),
    outline: z.boolean().optional().default(false)
  })
  .strict()
  .refine((set) => set.parcels.length + set.places.length + set.sets.length > 0, {
    message: 'selection set must not be empty'
  });

export type RawMapSelectionSet = z.output<typeof mapSelectionSetRawSchema>;
