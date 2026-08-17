import { reference, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

import {
  NEWS_AREAS,
  NEWS_AUTHOR_KINDS,
  isAbsoluteUrl,
  isAttachmentUrl,
  normalizeTagKey,
} from './schema';
import { normalizeNewsTimestampInput, parseNewsTimestampInput } from './date';
import { RawSearchAliasesSchema } from '../search/raw-schema';

const TAG = /^[а-яё0-9 -]+$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = z.string().trim();

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

const newsDate = (name: string) =>
  z.union([text, z.date()]).transform((value, ctx) => {
    const normalized = normalizeNewsTimestampInput(value);

    if (normalized && parseNewsTimestampInput(value)) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD`,
    });

    return z.NEVER;
  });

const newsDateTime = (name: string) =>
  z.union([text, z.date()]).transform((value, ctx) => {
    const normalized = normalizeNewsTimestampInput(value);
    const parsed = parseNewsTimestampInput(value);

    if (normalized && parsed?.has_time) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use dd.mm.yyyy hh:mm and include time`,
    });

    return z.NEVER;
  });

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

const eventOrganizer = () =>
  z.union([
    text,
    z.object({
      name: text,
      type: z.enum(['organization', 'person']).optional(),
    }),
  ]);

const eventPerformer = () =>
  z.union([
    text,
    z.object({
      name: text,
      type: z.enum(['organization', 'person']).optional(),
    }),
  ]);

const event = () =>
  z
    .object({
      slug: text
        .refine((value) => SLUG.test(value), 'events[].slug must be a slug')
        .optional(),
      title: text,
      description: text.optional(),
      starts_at: newsDateTime('events[].starts_at'),
      ends_at: newsDateTime('events[].ends_at').optional(),
      location: text.optional(),
      coordinates: z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
        .optional(),
      organizer: eventOrganizer().optional(),
      performer: z.array(eventPerformer()).min(1).optional(),
    })
    .superRefine((data, ctx) => {
      const starts = parseNewsTimestampInput(data.starts_at);
      const ends = data.ends_at
        ? parseNewsTimestampInput(data.ends_at)
        : undefined;

      if (starts && ends && ends.at.valueOf() <= starts.at.valueOf()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ends_at'],
          message: 'events[].ends_at must be later than events[].starts_at',
        });
      }
    });

type NewsEventInput = z.infer<ReturnType<typeof event>>;

function validateEventSlugs(
  events: readonly NewsEventInput[] | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!events?.length) {
    return;
  }

  const seen = new Set<string>();
  const requiresExplicitSlug = events.length > 1;

  events.forEach((item, index) => {
    if (requiresExplicitSlug && !item.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['events', index, 'slug'],
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
        path: ['events', index, 'slug'],
        message: `duplicate event slug "${item.slug}"`,
      });
      return;
    }

    seen.add(item.slug);
  });
}

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
      date: newsDate('date'),
      time: forbiddenTime('time').optional(),
      author: reference('newsAuthors'),
      pinned: z.boolean().optional(),
      pinned_until: newsDate('pinned_until').optional(),
      areas: z.array(z.enum(NEWS_AREAS)).min(1).optional(),
      tags: z.array(tag()).min(1).optional(),
      search_aliases: RawSearchAliasesSchema.optional(),
      source_url: absoluteUrl('source_url').optional(),
      cover: image().optional(),
      cover_alt: text.optional(),
      events: z.array(event()).min(1).optional(),
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
      validateEventSlugs(data.events, ctx);
    });

export type RawNewsArticle = z.output<
  ReturnType<typeof createRawNewsArticleSchema>
>;
