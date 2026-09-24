import { z } from 'zod';

import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';
import { RawPolygonGeometrySchema } from '@/lib/geometry/raw-polygon-schema';

const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90)
]);

/** Validate serialized domain data at the HTML attribute boundary, without remapping geometry. */
export const EditorialMapDataSchema: z.ZodType<EditorialFeatureCollection> = z.strictObject({
  type: z.literal('FeatureCollection'),
  metadata: z
    .strictObject({
      name: z.string().optional(),
      description: z.string().optional(),
      creator: z.string().optional()
    })
    .optional(),
  features: z
    .array(
      z
        .strictObject({
          type: z.literal('Feature'),
          id: z.union([z.number().finite(), z.string()]).optional(),
          geometry: z.discriminatedUnion('type', [
            z.strictObject({ type: z.literal('Point'), coordinates: position }),
            z.strictObject({
              type: z.literal('LineString'),
              coordinates: z.array(position).min(2)
            }),
            ...RawPolygonGeometrySchema.options
          ]),
          description: z.string().optional(),
          iconCaption: z.string().optional(),
          iconContent: z
            .string()
            .regex(/^[0-9]$/)
            .optional(),
          markerColor: z.string().optional(),
          stroke: z.string().optional(),
          strokeWidth: z.number().finite().nonnegative().optional(),
          strokeOpacity: z.number().finite().min(0).max(1).optional(),
          strokeDasharray: z
            .array(z.number().finite().positive())
            .min(2)
            .refine((dash) => dash.length % 2 === 0)
            .optional(),
          fill: z.string().optional(),
          fillOpacity: z.number().finite().min(0).max(1).optional(),
          precision: z.literal('approximate').optional()
        })
        .superRefine((feature, context) => {
          if (feature.iconContent !== undefined && feature.geometry.type !== 'Point') {
            context.addIssue({
              code: 'custom',
              path: ['iconContent'],
              message: 'iconContent requires a Point'
            });
          }
        })
    )
    .min(1)
});
