import { z } from 'astro/zod';

import { CONTACT_CATEGORIES, CONTACT_SLUG } from '@/lib/contacts/schema';

import {
  isPlaceCalendarDate,
  PLACE_CATEGORIES,
  PLACE_MAP_BOUNDS,
  PLACE_MARKERS,
  PLACE_STATUSES,
  PLACE_TIME,
  PLACE_WEEKDAYS,
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

const YANDEX_MAP_ORIGIN = 'https://yandex.ru';
const YANDEX_MAP_PATH = /^\/(?:maps|navi)(?:\/|$)/u;
const isYandexMapUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      url.origin === YANDEX_MAP_ORIGIN &&
      !url.username &&
      !url.password &&
      YANDEX_MAP_PATH.test(url.pathname)
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

const placeTime = nonBlankText.regex(PLACE_TIME, {
  message: 'time must use HH:mm',
});

const openingHoursPeriod = z
  .object({
    days: z.array(z.enum(PLACE_WEEKDAYS)).min(1),
    opens_at: placeTime,
    closes_at: placeTime,
  })
  .strict()
  .refine(({ opens_at, closes_at }) => opens_at < closes_at, {
    path: ['closes_at'],
    message: 'opening-hours periods must start before they end',
  });

const openingHours = z
  .object({
    description: nonBlankText,
    periods: z.array(openingHoursPeriod).min(1),
  })
  .strict();

export const RawPlaceSchema = z
  .object({
    title: nonBlankText,
    category: z.enum(PLACE_CATEGORIES),
    marker: z.enum(PLACE_MARKERS).optional(),
    status: z.enum(PLACE_STATUSES),
    updated_at: placeDate('updated_at'),
    summary: nonBlankText,
    location,
    opening_hours: openingHours.optional(),
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
