import { z } from 'zod';

import { PARCEL_CODE, PARCEL_PARTS } from '@/lib/parcels/schema';

export const parcelSearchFeedSchema = z.strictObject({
  parcels: z.array(
    z.strictObject({
      code: z.string().regex(PARCEL_CODE),
      aliases: z.array(z.string().regex(PARCEL_CODE)),
      part: z.enum(PARCEL_PARTS)
    })
  )
});
