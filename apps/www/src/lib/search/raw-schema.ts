import { z } from 'astro/zod';

export const RawSearchAliasesSchema = z.array(z.string().trim().min(1)).min(1);
