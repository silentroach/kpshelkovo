import * as z from 'zod/mini';

import { STATUS_KINDS, STATUS_SERVICES } from '@/lib/status/schema';

// ECMAScript Date range, in whole milliseconds.
const timestamp = z
  .int()
  .check(z.minimum(-8_640_000_000_000_000), z.maximum(8_640_000_000_000_000));

const windowSchema = z
  .strictObject({
    kind: z.enum(STATUS_KINDS),
    start: timestamp,
    end: z.optional(timestamp)
  })
  .check(z.refine((window) => window.end === undefined || window.end >= window.start));

export const HomeServiceWindowsSchema = z
  .array(
    z.strictObject({
      service: z.enum(STATUS_SERVICES),
      windows: z.array(windowSchema).check(z.minLength(1))
    })
  )
  .check(
    z.refine((groups) => new Set(groups.map((group) => group.service)).size === groups.length)
  );
