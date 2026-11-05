import * as z from 'zod/mini';

import { STATUS_AREAS } from './schema';

export const statusTimelineRecordsSchema = z.readonly(
  z.array(
    z.readonly(
      z.object({
        id: z.string(),
        href: z.optional(z.string().check(z.startsWith('/status/incidents/'))),
        kind: z.enum(['incident', 'maintenance']),
        title: z.string(),
        phase: z.enum(['scheduled', 'active', 'resolved']),
        startedIso: z.iso.datetime({ offset: true }),
        startedHasTime: z.boolean(),
        endedIso: z.optional(z.iso.datetime({ offset: true })),
        endedHasTime: z.boolean(),
        areas: z.optional(z.readonly(z.array(z.enum(STATUS_AREAS)))),
        areaLabel: z.optional(z.string()),
        periodLabel: z.string(),
        activePeriodLabel: z.optional(z.string()),
        singleDayDate: z.optional(z.string()),
        singleDayPeriodLabel: z.optional(z.string())
      })
    )
  )
);
