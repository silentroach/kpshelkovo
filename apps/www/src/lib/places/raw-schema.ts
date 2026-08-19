import { z } from 'astro/zod';

import { CONTACT_CATEGORIES, CONTACT_SLUG } from '@/lib/contacts/schema';

import {
  isPlaceCalendarDate,
  PLACE_CATEGORIES,
  PLACE_MAP_BOUNDS,
  PLACE_STATUSES,
} from './schema';

const nonBlankText = z.string().trim().min(1);

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const httpsUrl = nonBlankText.url().refine(isHttpsUrl, {
  message: 'url must use https://',
});

const isYandexMapUrl = (value: string): boolean => {
  try {
    const hostname = new URL(value).hostname;

    return (
      hostname === 'yandex.ru' ||
      hostname.endsWith('.yandex.ru') ||
      hostname === 'yandex.com' ||
      hostname.endsWith('.yandex.com')
    );
  } catch {
    return false;
  }
};

const yandexMapUrl = httpsUrl.refine(isYandexMapUrl, {
  message: 'map_url must point to Yandex Maps',
});

const placeDate = (name: string) =>
  z.union([nonBlankText, z.date()]).transform((value, ctx) => {
    const normalized =
      value instanceof Date ? value.toISOString().slice(0, 10) : value;

    if (isPlaceCalendarDate(normalized)) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use YYYY-MM-DD`,
    });

    return z.NEVER;
  });

const contactCategories = new Set<string>(CONTACT_CATEGORIES);
const isContactReference = (value: string): boolean => {
  const [category, slug, ...rest] = value.split('/');

  return (
    rest.length === 0 &&
    Boolean(category && contactCategories.has(category)) &&
    Boolean(slug && CONTACT_SLUG.test(slug))
  );
};

const coordinates = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict()
  .refine(
    ({ lat, lng }) =>
      lat >= PLACE_MAP_BOUNDS.minLat &&
      lat <= PLACE_MAP_BOUNDS.maxLat &&
      lng >= PLACE_MAP_BOUNDS.minLng &&
      lng <= PLACE_MAP_BOUNDS.maxLng,
    { message: 'coordinates must be inside the supported Шелково map bounds' },
  );

const location = z
  .object({
    map_url: yandexMapUrl,
    address: nonBlankText,
    coordinates,
  })
  .strict();

const evidence = z
  .object({
    source_url: httpsUrl,
    checked_at: placeDate('evidence.checked_at'),
  })
  .strict();

export const RawPlaceSchema = z
  .object({
    title: nonBlankText,
    category: z.enum(PLACE_CATEGORIES),
    status: z.enum(PLACE_STATUSES),
    updated_at: placeDate('updated_at'),
    summary: nonBlankText,
    location,
    contact: nonBlankText
      .refine(isContactReference, {
        message: 'contact must use a known category and slug: category/slug',
      })
      .optional(),
    evidence: evidence.optional(),
  })
  .strict()
  .superRefine((place, ctx) => {
    if (place.status === 'existing' || place.evidence) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evidence'],
      message: 'planned and under-construction places require evidence',
    });
  });

export type RawPlace = z.output<typeof RawPlaceSchema>;
