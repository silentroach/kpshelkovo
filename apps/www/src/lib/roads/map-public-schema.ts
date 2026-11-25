import { z } from 'zod';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const RoadMapPublicSchema = z.object({
  source: z.url(),
  license: z.url(),
  lines: z.array(z.array(position).min(2)).min(1)
});

export type RoadMapPublicDto = z.output<typeof RoadMapPublicSchema>;
