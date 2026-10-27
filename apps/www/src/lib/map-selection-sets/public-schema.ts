import { z } from 'zod';

import { EditorialPublicGeometrySchema } from '@/lib/geometry/editorial-public-schema';
import { PARCEL_CODE } from '@/lib/parcels/schema';

export const mapSelectionSetPublicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    parcels: z.array(z.string().regex(PARCEL_CODE)),
    places: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    outline: z.boolean(),
    geometry: EditorialPublicGeometrySchema.optional()
  })
  .strict()
  .refine((set) => set.parcels.length + set.places.length > 0, {
    message: 'selection set must not be empty'
  });
