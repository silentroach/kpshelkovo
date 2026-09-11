import type { z } from 'zod';

/** Every DTO key must have a schema with the same required/optional status. */
export type PublicShape<T> = {
  readonly [Key in keyof T]-?: undefined extends T[Key]
    ? z.ZodOptional<z.ZodType<Exclude<T[Key], undefined>>>
    : z.ZodType<T[Key]>;
};
