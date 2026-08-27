import { reference, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

import { contentDateSchema, contentDateTimeSchema } from '@/lib/content-date';

import {
  NEWS_AREAS,
  NEWS_AUTHOR_KINDS,
  isAbsoluteUrl,
  isAttachmentUrl,
  normalizeTagKey,
} from './schema';
import { RawSearchAliasesSchema } from '../search/raw-schema';

const TAG = /^[а-яё0-9 -]+$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = z.string().trim();
const eventText = (name: string) => text.min(1, `${name} must not be blank`);

const absoluteUrl = (name: string) =>
  text.refine(
    (value) => isAbsoluteUrl(value),
    `${name} must be an absolute URL`,
  );

const attachmentUrl = (name: string) =>
  text.refine(
    (value) => isAttachmentUrl(value),
    `${name} must be an absolute URL or a root-relative path`,
  );

const forbiddenTime = (name: string) =>
  text.refine(
    () => false,
    `${name} is not supported; include time in date as dd.mm.yyyy hh:mm`,
  );

const tag = () =>
  text
    .refine(
      (value) => value === value.toLowerCase(),
      'tags[] must be lower-case',
    )
    .refine(
      (value) => TAG.test(value),
      'tags[] may contain only Cyrillic, digits, spaces, and hyphen',
    );

const attachment = () =>
  z.object({
    title: text,
    url: attachmentUrl('attachments[].url'),
    type: text.optional(),
    size: text.optional(),
  });

const newsPhotoUrl = (name: string) =>
  text.refine((value) => {
    if (!isAbsoluteUrl(value)) {
      return false;
    }

    const url = new URL(value);

    return (
      url.origin === 'https://media.kpshelkovo.online' &&
      url.pathname.startsWith('/news/') &&
      !url.search &&
      !url.hash
    );
  }, `${name} must use an immutable https://media.kpshelkovo.online/news/ URL without query or hash`);

const photo = () =>
  z.object({
    url: newsPhotoUrl('photos[].url'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alt: text,
    caption: text.optional(),
  });

const media = () => ({
  photos: z.array(photo()).min(1).optional(),
  attachments: z.array(attachment()).min(1).optional(),
});

const eventParticipant = (name: string) =>
  z.union([
    eventText(name),
    z.object({
      name: eventText(`${name}.name`),
      type: z.enum(['organization', 'person']).optional(),
    }),
  ]);

const RawNewsEventSchema = z
  .object({
    slug: text
      .refine((value) => SLUG.test(value), 'events[].slug must be a slug')
      .optional(),
    title: eventText('events[].title'),
    description: eventText('events[].description').optional(),
    starts_at: contentDateTimeSchema('events[].starts_at'),
    ends_at: contentDateTimeSchema('events[].ends_at').optional(),
    location: eventText('events[].location').optional(),
    coordinates: z
      .object({
        lat: z
          .number()
          .min(-90, 'events[].coordinates.lat must be between -90 and 90')
          .max(90, 'events[].coordinates.lat must be between -90 and 90'),
        lng: z
          .number()
          .min(-180, 'events[].coordinates.lng must be between -180 and 180')
          .max(180, 'events[].coordinates.lng must be between -180 and 180'),
      })
      .optional(),
    organizer: eventParticipant('events[].organizer').optional(),
    performer: z
      .array(eventParticipant('events[].performer[]'))
      .min(1)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const starts = data.starts_at;
    const ends = data.ends_at;

    if (ends && ends.at.valueOf() <= starts.at.valueOf()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'events[].ends_at must be later than events[].starts_at',
      });
    }
  });

export type RawNewsEventInput = z.input<typeof RawNewsEventSchema>;

type NewsEventInput = z.output<typeof RawNewsEventSchema>;

function validateEventSlugs(
  events: readonly NewsEventInput[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  const requiresExplicitSlug = events.length > 1;

  events.forEach((item, index) => {
    if (requiresExplicitSlug && !item.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'slug'],
        message: 'events[].slug is required when article has multiple events',
      });
      return;
    }

    if (!item.slug) {
      return;
    }

    if (seen.has(item.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'slug'],
        message: `duplicate event slug "${item.slug}"`,
      });
      return;
    }

    seen.add(item.slug);
  });
}

export const RawNewsEventsSchema = z
  .array(RawNewsEventSchema)
  .min(1)
  .superRefine(validateEventSlugs);

function validateTags(
  tags: readonly string[] | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!tags) {
    return;
  }

  const seen = new Set<string>();

  tags.forEach((item, index) => {
    const key = normalizeTagKey(item);

    if (!key) {
      return;
    }

    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tags', index],
        message: `duplicate tag key "${key}" after normalization`,
      });
      return;
    }

    seen.add(key);
  });
}

export const RawNewsAuthorSchema = z.object({
  name: text,
  kind: z.enum(NEWS_AUTHOR_KINDS),
  short_name: text.optional(),
  url: absoluteUrl('url').optional(),
  role: text.optional(),
});

export type RawNewsAuthor = z.output<typeof RawNewsAuthorSchema>;

export const createRawNewsArticleSchema = (image: SchemaContext['image']) =>
  z
    .object({
      title: text,
      summary: text,
      date: contentDateSchema('date'),
      time: forbiddenTime('time').optional(),
      author: reference('newsAuthors'),
      pinned: z.boolean().optional(),
      pinned_until: contentDateSchema('pinned_until').optional(),
      areas: z.array(z.enum(NEWS_AREAS)).min(1).optional(),
      tags: z.array(tag()).min(1).optional(),
      search_aliases: RawSearchAliasesSchema.optional(),
      source_url: absoluteUrl('source_url').optional(),
      cover: image().optional(),
      cover_alt: text.optional(),
      events: RawNewsEventsSchema.optional(),
      ...media(),
      seo: z
        .object({
          title: text.optional(),
          description: text.optional(),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.cover && !data.cover_alt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cover_alt'],
          message: 'cover_alt is required when cover is set',
        });
      }

      validateTags(data.tags, ctx);
    });

export type RawNewsArticle = z.output<
  ReturnType<typeof createRawNewsArticleSchema>
>;
