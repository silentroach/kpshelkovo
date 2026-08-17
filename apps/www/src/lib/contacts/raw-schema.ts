import { z } from 'astro/zod';

import {
  CONTACT_CATEGORIES,
  CONTACT_REVIEW_SENTIMENTS,
  CONTACT_SLUG,
  isContactCalendarDate,
} from './schema';
import { RawSearchAliasesSchema } from '@/lib/search/raw-schema';

const nonBlankText = z.string().trim().min(1);

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const contactUrl = nonBlankText.url().refine(isHttpsUrl, {
  message: 'url must use https://',
});

const contactDate = (name: string) =>
  z.union([nonBlankText, z.date()]).transform((value, ctx) => {
    const normalized =
      value instanceof Date ? value.toISOString().slice(0, 10) : value;

    if (isContactCalendarDate(normalized)) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use YYYY-MM-DD`,
    });

    return z.NEVER;
  });

const contacts = z
  .object({
    phone: nonBlankText.optional(),
    telegram: contactUrl.optional(),
    whatsapp: contactUrl.optional(),
    email: nonBlankText.email().optional(),
    website: contactUrl.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.phone ||
      value.telegram ||
      value.whatsapp ||
      value.email ||
      value.website
    ) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'contacts must include at least one public contact method',
    });
  });

const location = z
  .object({
    title: nonBlankText,
    url: contactUrl,
    address: nonBlankText.optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .strict()
      .optional(),
  })
  .strict();

const seo = z
  .object({
    description: nonBlankText.optional(),
  })
  .strict();

const review = z
  .object({
    sentiment: z.enum(CONTACT_REVIEW_SENTIMENTS),
    summary: nonBlankText,
    published_at: contactDate('reviews.published_at'),
    url: contactUrl,
  })
  .strict();

const vcfName = z
  .object({
    family: nonBlankText,
    given: nonBlankText,
    additional: nonBlankText.optional(),
    prefix: nonBlankText.optional(),
    suffix: nonBlankText.optional(),
  })
  .strict();

const vcfContactFields = {
  phone: nonBlankText.optional(),
  telegram: contactUrl.optional(),
  whatsapp: contactUrl.optional(),
  email: nonBlankText.email().optional(),
  website: contactUrl.optional(),
  address: nonBlankText.optional(),
  job_title: nonBlankText.optional(),
  role: nonBlankText.optional(),
  note: nonBlankText.optional(),
} as const;

const disabledVcf = z.object({ enable: z.literal(false) }).strict();

const personVcf = z
  .object({
    enable: z.literal(true),
    kind: z.literal('person'),
    full_name: nonBlankText.optional(),
    name: vcfName,
    organization: nonBlankText.optional(),
    ...vcfContactFields,
  })
  .strict();

const organizationVcf = z
  .object({
    enable: z.literal(true),
    kind: z.literal('organization'),
    full_name: nonBlankText.optional(),
    organization: nonBlankText,
    ...vcfContactFields,
  })
  .strict();

const vcf = z.union([disabledVcf, personVcf, organizationVcf]);

export const RawContactSchema = z
  .object({
    title: nonBlankText,
    slug: nonBlankText.refine((value) => CONTACT_SLUG.test(value), {
      message: 'slug must use lower-case Latin letters, digits, and hyphen',
    }),
    category: z.enum(CONTACT_CATEGORIES),
    updated_at: contactDate('updated_at'),
    summary: nonBlankText.optional(),
    search_aliases: RawSearchAliasesSchema.optional(),
    contacts,
    location: location.optional(),
    reviews: z.array(review).optional(),
    seo: seo.optional(),
    vcf: vcf.optional(),
  })
  .strict();

export type RawContact = z.output<typeof RawContactSchema>;
