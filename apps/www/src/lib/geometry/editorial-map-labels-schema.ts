import { z } from 'zod';

export const EditorialParcelLabelsSchema = z.array(
  z.strictObject({
    text: z.string().refine((text) => text.trim().length > 0, 'expected nonempty text'),
    coordinates: z.tuple([
      z.number().finite().min(-180).max(180),
      z.number().finite().min(-90).max(90)
    ])
  })
);
