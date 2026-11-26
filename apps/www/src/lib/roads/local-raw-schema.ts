import { z } from 'zod';

export const RawLocalRoadsSchema = z.array(
  z.strictObject({
    id: z.string().trim().min(1),
    points: z
      .array(
        z.union([
          z.strictObject({ osm_node: z.int().positive() }),
          z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
        ])
      )
      .min(2)
  })
);

export type RawLocalRoads = z.output<typeof RawLocalRoadsSchema>;
