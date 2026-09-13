import { z } from 'astro/zod';

import { CONTACT_CATEGORIES, CONTACT_SLUG } from './schema';

const ContactCategorySchema = z.enum(CONTACT_CATEGORIES);
const ContactSlugSchema = z.string().regex(CONTACT_SLUG);
const ContactIdentitySchema = z.object({
  category: z.coerce.string().optional(),
  slug: z.coerce.string().optional()
});

function failContact(entry: string, reason: string): never {
  throw new Error(`contact path "${entry}" ${reason}`);
}

export function contactSourceId(entry: string, data: unknown): string {
  if (!entry.endsWith('.md')) {
    failContact(entry, 'must be a Markdown file');
  }

  const input = ContactIdentitySchema.safeParse(data);
  const { category, slug } = input.success ? input.data : {};

  if (!slug) {
    failContact(entry, 'must define slug');
  }

  if (!category) {
    failContact(entry, 'must define category');
  }

  if (!ContactSlugSchema.safeParse(slug).success) {
    failContact(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  if (!ContactCategorySchema.safeParse(category).success) {
    failContact(entry, `category "${category}" is unknown`);
  }

  return `${category}/${slug}`;
}
