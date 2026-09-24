import { z } from 'astro/zod';

import { RawPolygonGeometrySchema } from '../geometry/raw-polygon-schema.ts';
import {
  PARCEL_CADASTRAL_NUMBER,
  PARCEL_CODE,
  PARCEL_FEATURES,
  PARCEL_STATUSES
} from './schema.ts';

const code = z.string().regex(PARCEL_CODE);

export const RawParcelSchema = z
  .object({
    code,
    aliases: z.array(code).default([]),
    cadastral_number: z.string().regex(PARCEL_CADASTRAL_NUMBER).optional(),
    geometry: RawPolygonGeometrySchema.optional(),
    area_m2: z.number().positive().optional(),
    cadastral_parts: z
      .array(
        z
          .object({
            cadastral_number: z.string().regex(PARCEL_CADASTRAL_NUMBER),
            geometry: RawPolygonGeometrySchema,
            area_m2: z.number().positive().optional()
          })
          .strict()
      )
      .min(2)
      .optional(),
    status: z.enum(PARCEL_STATUSES).optional(),
    features: z.array(z.enum(PARCEL_FEATURES)).default([]),
    price_history: z
      .array(z.object({ on: z.iso.date(), price: z.number().int().positive() }).strict())
      .default([])
  })
  .strict()
  .superRefine(
    (
      { code, aliases, price_history, cadastral_number, geometry, area_m2, cadastral_parts },
      ctx
    ) => {
      if (
        Boolean(cadastral_number && geometry) === Boolean(cadastral_parts) ||
        Boolean(cadastral_number) !== Boolean(geometry) ||
        (cadastral_parts && area_m2 !== undefined)
      ) {
        ctx.addIssue({ code: 'custom', message: 'specify exactly one complete cadastral form' });
      }
      if (
        cadastral_parts &&
        new Set(cadastral_parts.map((part) => part.cadastral_number)).size !==
          cadastral_parts.length
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['cadastral_parts'],
          message: 'duplicate cadastral number in group'
        });
      }
      const seen = new Set([code]);

      aliases.forEach((alias, index) => {
        if (seen.has(alias)) {
          ctx.addIssue({
            code: 'custom',
            path: ['aliases', index],
            message: `duplicate code ${alias}`
          });
        }
        seen.add(alias);
      });

      price_history.forEach((observation, index) => {
        const previous = price_history[index - 1];
        if (previous && observation.on < previous.on) {
          ctx.addIssue({
            code: 'custom',
            path: ['price_history', index],
            message: 'price history must be ordered by observation date'
          });
        }
      });
    }
  );

export type RawParcel = z.output<typeof RawParcelSchema>;
