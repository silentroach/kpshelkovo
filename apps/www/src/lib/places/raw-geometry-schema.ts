import { z } from 'astro/zod';

import { PLACE_MAP_BOUNDS } from './schema';

const position = z
  .tuple([z.number().finite(), z.number().finite()])
  .refine(
    ([lng, lat]) =>
      lng >= PLACE_MAP_BOUNDS.minLng &&
      lng <= PLACE_MAP_BOUNDS.maxLng &&
      lat >= PLACE_MAP_BOUNDS.minLat &&
      lat <= PLACE_MAP_BOUNDS.maxLat,
    { message: 'coordinates must be inside the supported Шелково map bounds' },
  );

const polygonRing = z
  .array(position)
  .min(4)
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring.at(-1);

      return Boolean(
        first && last && first[0] === last[0] && first[1] === last[1],
      );
    },
    { message: 'polygon rings must be closed' },
  )
  .refine(
    (ring) =>
      new Set(ring.slice(0, -1).map(([lng, lat]) => `${lng},${lat}`)).size >= 3,
    { message: 'polygon rings must contain three distinct positions' },
  )
  .refine(
    (ring) =>
      Math.abs(
        ring.slice(0, -1).reduce((area, [lng, lat], index) => {
          const next = ring[index + 1];

          return next ? area + lng * next[1] - next[0] * lat : area;
        }, 0),
      ) > 1e-12,
    { message: 'polygon rings must enclose an area' },
  );

const polygonCoordinates = z.array(polygonRing).min(1);
const polygonGeometry = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('Polygon'),
      coordinates: polygonCoordinates,
    })
    .strict(),
  z
    .object({
      type: z.literal('MultiPolygon'),
      coordinates: z.array(polygonCoordinates).min(1),
    })
    .strict(),
]);
const openStreetMapWayUrl = z
  .string()
  .regex(/^https:\/\/www\.openstreetmap\.org\/way\/\d+$/u);

const areaFeature = z
  .object({
    type: z.literal('Feature'),
    id: z.literal('area'),
    properties: z
      .object({
        kind: z.literal('area'),
        precision: z.literal('approximate'),
        source: z.literal('openstreetmap'),
        source_refs: z.array(openStreetMapWayUrl).min(1),
        outline_expansion_meters: z.number().positive().max(25).optional(),
      })
      .strict(),
    geometry: polygonGeometry,
  })
  .strict();

export const RawPlaceGeometrySchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.tuple([areaFeature]),
  })
  .strict();

export type RawPlaceGeometry = z.output<typeof RawPlaceGeometrySchema>;
