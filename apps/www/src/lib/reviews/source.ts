import { z } from 'astro/zod';

import { REVIEW_DATE, REVIEW_SLUG, reviewIdFromParts } from './schema';

const ReviewDateSchema = z.string().regex(REVIEW_DATE);
const ReviewSlugSchema = z.string().regex(REVIEW_SLUG);
const ReviewIdentitySchema = z.object({
  published_at: z.unknown().refine((value) => value !== undefined),
  slug: z.unknown().refine((value) => value !== undefined)
});

function failReview(entry: string, reason: string): never {
  throw new Error(`review path "${entry}" ${reason}`);
}

export function reviewSourceId(entry: string, data: unknown, readBody: () => string): string {
  if (!entry.endsWith('.md')) {
    failReview(entry, 'must be a Markdown file');
  }

  const input = ReviewIdentitySchema.safeParse(data);
  if (!input.success) {
    failReview(entry, 'must define published_at and slug');
  }

  const publishedIso =
    input.data.published_at instanceof Date
      ? input.data.published_at.toISOString().slice(0, 10)
      : String(input.data.published_at);
  const slug = String(input.data.slug);

  if (!ReviewDateSchema.safeParse(publishedIso).success) {
    failReview(entry, 'published_at must use YYYY-MM-DD');
  }

  if (!ReviewSlugSchema.safeParse(slug).success) {
    failReview(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  if (!readBody().trim()) {
    failReview(entry, 'body is required');
  }

  return reviewIdFromParts({ publishedIso, slug });
}
