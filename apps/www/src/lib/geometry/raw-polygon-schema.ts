import { z } from 'astro/zod';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const polygonRing = z
  .array(position)
  .min(4)
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring.at(-1);

      return Boolean(first && last && first[0] === last[0] && first[1] === last[1]);
    },
    { message: 'polygon rings must be closed' }
  )
  .refine((ring) => new Set(ring.slice(0, -1).map(([lng, lat]) => `${lng},${lat}`)).size >= 3, {
    message: 'polygon rings must contain three distinct positions'
  })
  .refine(
    (ring) =>
      Math.abs(
        ring.slice(0, -1).reduce((area, [lng, lat], index) => {
          const next = ring[index + 1];

          return next ? area + lng * next[1] - next[0] * lat : area;
        }, 0)
      ) > 1e-12,
    { message: 'polygon rings must enclose an area' }
  );

const polygonCoordinates = z.array(polygonRing).min(1);

export const RawPolygonGeometrySchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('Polygon'),
      coordinates: polygonCoordinates
    })
    .strict(),
  z
    .object({
      type: z.literal('MultiPolygon'),
      coordinates: z.array(polygonCoordinates).min(1)
    })
    .strict()
]);
