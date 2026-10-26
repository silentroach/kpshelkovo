import { z } from 'zod';

import { EditorialPublicGeometrySchema } from '@/lib/geometry/editorial-public-schema';

import {
  PLACE_MAP_LAYERS,
  PLACE_MARKERS,
  PLACE_SLUG,
  PLACE_STATUSES,
  PLACE_TIME,
  PLACE_WEEKDAYS
} from './schema';

export const PlaceMapPublicPayloadSchema = z
  .object({
    places: z.array(
      z
        .object({
          slug: z.string().regex(PLACE_SLUG),
          mapLayer: z.enum(PLACE_MAP_LAYERS).optional(),
          name: z.string().trim().min(1),
          marker: z.enum(PLACE_MARKERS).optional(),
          status: z.enum(PLACE_STATUSES),
          status_label: z.string().optional(),
          coordinates: z
            .object({
              lat: z.number().min(-90).max(90),
              lng: z.number().min(-180).max(180)
            })
            .strict(),
          geometry: EditorialPublicGeometrySchema.optional(),
          opening_hours: z
            .object({
              description: z.string().optional(),
              periods: z
                .array(
                  z
                    .object({
                      days: z.array(z.enum(PLACE_WEEKDAYS)).min(1),
                      opens_at: z.string().regex(PLACE_TIME),
                      closes_at: z.string().regex(PLACE_TIME)
                    })
                    .strict()
                )
                .min(1)
            })
            .strict()
            .optional(),
          html_url: z.url()
        })
        .strict()
    )
  })
  .strict();
