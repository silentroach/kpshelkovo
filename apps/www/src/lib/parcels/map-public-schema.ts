import { z } from 'astro/zod';

import { RawPolygonGeometrySchema } from '@/lib/geometry/raw-polygon-schema';

import { PARCEL_CODE, PARCEL_PARTS } from './schema';

const code = z.string().regex(PARCEL_CODE);
const identity = {
  code,
  aliases: z.array(code),
  part: z.enum(PARCEL_PARTS)
};

export const ParcelMapPublicSchema = z.array(
  z
    .object({
      code,
      aliases: z.array(code).optional(),
      part: z.enum(PARCEL_PARTS),
      muted: z.boolean(),
      geometry: RawPolygonGeometrySchema,
      labelCoordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    })
    .strict()
);

export const ParcelSearchPublicSchema = z
  .object({ parcels: z.array(z.object(identity).strict()) })
  .strict();

export type ParcelMapPublicDto = z.output<typeof ParcelMapPublicSchema>;
export type ParcelSearchPublicDto = z.output<typeof ParcelSearchPublicSchema>;
