import { z } from 'zod';

import { RawPolygonGeometrySchema } from './raw-polygon-schema';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const EditorialPublicGeometrySchema = z
  .object({
    type: z.literal('FeatureCollection'),
    metadata: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        creator: z.string().optional()
      })
      .strict()
      .optional(),
    features: z
      .array(
        z
          .object({
            type: z.literal('Feature'),
            id: z.union([z.number().finite(), z.string()]).optional(),
            properties: z
              .object({
                description: z.string().optional(),
                iconCaption: z.string().optional(),
                iconContent: z
                  .string()
                  .regex(/^[0-9]$/)
                  .optional(),
                'marker-color': z.string().optional(),
                stroke: z.string().optional(),
                'stroke-width': z.number().nonnegative().optional(),
                'stroke-opacity': z.number().min(0).max(1).optional(),
                'stroke-dasharray': z
                  .array(z.number().positive())
                  .min(2)
                  .refine((values) => values.length % 2 === 0)
                  .optional(),
                fill: z.string().optional(),
                'fill-opacity': z.number().min(0).max(1).optional(),
                precision: z.literal('approximate').optional()
              })
              .strict(),
            geometry: z.discriminatedUnion('type', [
              z.object({ type: z.literal('Point'), coordinates: position }).strict(),
              z
                .object({ type: z.literal('LineString'), coordinates: z.array(position).min(2) })
                .strict(),
              ...RawPolygonGeometrySchema.options
            ])
          })
          .strict()
          .superRefine((feature, context) => {
            if (feature.properties.iconContent !== undefined && feature.geometry.type !== 'Point') {
              context.addIssue({
                code: 'custom',
                path: ['properties', 'iconContent'],
                message: 'iconContent requires a Point'
              });
            }
          })
      )
      .min(1)
  })
  .strict();

export type EditorialPublicGeometry = z.output<typeof EditorialPublicGeometrySchema>;
