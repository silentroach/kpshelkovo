import { z } from 'zod';

import { PARCEL_CODE } from './schema';

export const ParcelDetailsPublicSchema = z
  .object({
    code: z.string().regex(PARCEL_CODE),
    status: z.enum(['available', 'reserved']),
    area: z.number().positive().optional(),
    price: z
      .object({
        last: z.number().int().positive().optional(),
        history: z.array(z.tuple([z.iso.date(), z.number().int().positive()]))
      })
      .strict()
  })
  .strict();

export type ParcelDetailsPublicDto = z.output<typeof ParcelDetailsPublicSchema>;
