import { lexer } from 'css-tree';
import { z } from 'zod';

import { RawPolygonGeometrySchema } from './raw-polygon-schema';

const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90)
]);
const numericString = z
  .string()
  .trim()
  .regex(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/)
  .transform(Number);
const nonnegative = z.union([z.number().finite(), numericString]).pipe(z.number().nonnegative());
const positive = z.union([z.number().finite(), numericString]).pipe(z.number().positive());
const opacity = z.union([z.number().finite(), numericString]).pipe(z.number().min(0).max(1));
const color = z.string().refine((value) => !lexer.matchType('color', value).error, {
  message: 'expected a valid CSS color'
});
const dashArray = z
  .union([
    z.array(positive),
    z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?(?:[ ,]+\d+(?:\.\d+)?)+$/)
      .transform((value) => value.split(/[ ,]+/).map(Number))
  ])
  .pipe(
    z
      .array(z.number().positive())
      .min(2)
      .refine((values) => values.length % 2 === 0, {
        message: 'stroke-dasharray must alternate dash and gap lengths'
      })
  );

const properties = z
  .object({
    description: z.string().optional(),
    iconCaption: z.string().optional(),
    'marker-color': color.optional(),
    stroke: color.optional(),
    'stroke-width': nonnegative.optional(),
    'stroke-opacity': opacity.optional(),
    'stroke-dasharray': dashArray.optional(),
    fill: color.optional(),
    'fill-opacity': opacity.optional(),
    precision: z.literal('approximate').optional(),
    outline_expansion_meters: z.number().positive().max(25).optional()
  })
  .strict();

const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Point'), coordinates: position }).strict(),
  z.object({ type: z.literal('LineString'), coordinates: z.array(position).min(2) }).strict(),
  ...RawPolygonGeometrySchema.options
]);

const feature = z
  .object({
    type: z.literal('Feature'),
    id: z.union([z.number().finite(), z.string()]).optional(),
    properties,
    geometry
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.properties.outline_expansion_meters !== undefined &&
      (value.properties.precision !== 'approximate' ||
        (value.geometry.type !== 'Polygon' && value.geometry.type !== 'MultiPolygon'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['properties', 'outline_expansion_meters'],
        message: 'outline expansion requires an approximate Polygon or MultiPolygon'
      });
    }
  });

export const RawEditorialGeometrySchema = z
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
    features: z.array(feature).min(1, 'at least one feature is required')
  })
  .strict();

export type RawEditorialGeometry = z.output<typeof RawEditorialGeometrySchema>;
