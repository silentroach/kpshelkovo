import { z } from 'zod';

import { RawPolygonGeometrySchema } from '../geometry/raw-polygon-schema.ts';
import { PARCEL_CODE, PARCEL_PARTS, PARCEL_STATUSES } from './schema.ts';

const code = z.string().regex(PARCEL_CODE);
export const ParcelMapPublicSchema = z.array(
  z
    .object({
      code,
      aliases: z.array(code).optional(),
      part: z.enum(PARCEL_PARTS),
      status: z.enum(PARCEL_STATUSES).optional(),
      geometry: RawPolygonGeometrySchema,
      labelCoordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    })
    .strict()
);

export type ParcelMapPublicDto = z.output<typeof ParcelMapPublicSchema>;
