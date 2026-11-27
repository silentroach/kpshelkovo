import { isSimpleClosedRing } from '@shelkovo/geo';
import { z } from 'zod';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const ring = z.array(position).refine(isSimpleClosedRing, 'Expected a simple closed ring');

export const AsphaltAreasSchema = z.array(ring);
