import { z } from 'zod';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const lines = z.array(z.array(position).min(2));

export const RoadMapPublicSchema = z.strictObject({
  asphalt: lines,
  gravel: lines
});

export type RoadMapPublicDto = z.output<typeof RoadMapPublicSchema>;
