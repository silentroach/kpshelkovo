import { z } from 'zod';

export const mapSelectionSetRawSchema = z
  .object({
    parcels: z.array(z.string()).optional().default([]),
    places: z.array(z.string()).optional().default([]),
    sets: z.array(z.string()).optional().default([]),
    outline: z.boolean().optional().default(false)
  })
  .strict()
  .refine((set) => set.parcels.length + set.places.length + set.sets.length > 0, {
    message: 'selection set must not be empty'
  });

export type RawMapSelectionSet = z.output<typeof mapSelectionSetRawSchema>;
