import { z } from 'astro/zod';

import { contentDateSchema } from '@/lib/content-date';

import {
  isAbsoluteUrl,
  STATUS_AREAS,
  STATUS_KINDS,
  STATUS_SERVICES,
} from './schema';

const text = z.string().trim();

const absoluteUrl = (name: string) =>
  text.refine(
    (value) => isAbsoluteUrl(value),
    `${name} must be an absolute URL`,
  );

const statusSeo = () =>
  z
    .object({
      description: text.optional(),
    })
    .strict();

export const RawStatusIncidentSchema = z
  .object({
    title: text.optional(),
    seo: statusSeo().optional(),
    service: z.enum(STATUS_SERVICES),
    kind: z.enum(STATUS_KINDS),
    started_at: contentDateSchema('started_at'),
    ended_at: contentDateSchema('ended_at').optional(),
    areas: z.array(z.enum(STATUS_AREAS)).min(1).optional(),
    source_url: absoluteUrl('source_url').optional(),
  })
  .superRefine((data, ctx) => {
    const started = data.started_at;
    const ended = data.ended_at;

    if (ended && ended.at.valueOf() < started.at.valueOf()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ended_at'],
        message: 'ended_at must be later than or equal to started_at',
      });
    }
  });

export type RawStatusIncident = z.output<typeof RawStatusIncidentSchema>;
