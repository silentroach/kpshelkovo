import { z } from 'zod';

import { PARCEL_CODE, PARCEL_PARTS } from './schema';

export const ParcelDetailsPublicSchema = z
  .object({
    code: z.string().regex(PARCEL_CODE),
    part: z.enum(PARCEL_PARTS),
    status: z.enum(['available', 'reserved']),
    areaM2: z.number().positive().optional(),
    priceHistory: z.array(
      z.object({ on: z.iso.date(), price: z.number().int().positive() }).strict()
    )
  })
  .strict();

export type ParcelDetailsPublicDto = z.output<typeof ParcelDetailsPublicSchema>;
