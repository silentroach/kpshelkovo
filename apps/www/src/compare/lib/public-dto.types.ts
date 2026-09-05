import type { z } from 'zod';

import type { ComparePublicPayloadSchema } from './public-schema';

type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;

export type ComparePublicPayload = DeepReadonly<
  z.output<typeof ComparePublicPayloadSchema>
>;
export type ComparePublicSettlement =
  ComparePublicPayload['settlements'][number];
export type PublicComparison = ComparePublicPayload['comparisons'][string];
export type PublicComparisons = ComparePublicPayload['comparisons'];
export type PublicStats = ComparePublicPayload['stats'];
