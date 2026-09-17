import { z } from 'astro/zod';

import { CONTACT_CATEGORIES, CONTACT_SLUG } from '@/lib/contacts/schema';
import { RawSearchAliasesSchema } from '@/lib/search/raw-schema';

import {
  PLACE_CATEGORIES,
  PLACE_MARKERS,
  PLACE_STATUSES,
  PLACE_TIME,
  PLACE_WEEKDAYS
} from './schema';

const nonBlankText = z.string().trim().min(1);

const nameCases = z
  .object({
    gen: nonBlankText.optional(),
    dat: nonBlankText.optional(),
    acc: nonBlankText.optional(),
    ins: nonBlankText.optional(),
    prep: nonBlankText.optional()
  })
  .strict();

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const httpsUrl = nonBlankText.url().refine(isHttpsUrl, {
  message: 'url must use https://'
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
  message: 'map_url must point to Yandex Maps'
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
    lng: z.number().min(-180).max(180)
  })
  .strict();

const location = z
  .object({
    map_url: yandexMapUrl.optional(),
    address: nonBlankText.optional(),
    coordinates
  })
  .strict();

const placeTime = nonBlankText.regex(PLACE_TIME, {
  message: 'time must use HH:mm'
});

const openingHoursPeriod = z
  .object({
    days: z.array(z.enum(PLACE_WEEKDAYS)).min(1),
    opens_at: placeTime,
    closes_at: placeTime
  })
  .strict()
  .refine(({ opens_at, closes_at }) => opens_at < closes_at, {
    path: ['closes_at'],
    message: 'opening-hours periods must start before they end'
  });

const openingHours = z
  .object({
    description: nonBlankText.optional(),
    periods: z.array(openingHoursPeriod).min(1)
  })
  .strict();

export const RawPlaceSchema = z
  .object({
    title: nonBlankText,
    name_cases: nameCases.optional(),
    category: z.enum(PLACE_CATEGORIES),
    marker: z.enum(PLACE_MARKERS).optional(),
    status: z.enum(PLACE_STATUSES),
    show_on_map: z.boolean().optional(),
    summary: nonBlankText,
    search_aliases: RawSearchAliasesSchema.optional(),
    location,
    opening_hours: openingHours.optional(),
    contact: nonBlankText
      .refine(isContactReference, {
        message: 'contact must use a known category and slug: category/slug'
      })
      .optional()
  })
  .strict()
  .superRefine((place, ctx) => {
    if (!place.opening_hours) return;

    for (const day of PLACE_WEEKDAYS) {
      const periods = place.opening_hours.periods
        .map((period, index) => ({
          days: period.days,
          opens_at: period.opens_at,
          closes_at: period.closes_at,
          index
        }))
        .filter((period) => period.days.includes(day))
        .sort((a, b) => a.opens_at.localeCompare(b.opens_at));

      for (let index = 1; index < periods.length; index++) {
        const previous = periods[index - 1]!;
        const current = periods[index]!;
        if (current.opens_at > previous.closes_at) continue;

        const touching = current.opens_at === previous.closes_at;
        ctx.addIssue({
          code: 'custom',
          path: ['opening_hours', 'periods', current.index],
          message: `place "${place.title}": opening-hours periods conflict on ${day}: ${previous.opens_at}–${previous.closes_at} and ${current.opens_at}–${current.closes_at}${touching ? '; write continuous hours as one period' : ''}`
        });
      }
    }
  });

export type RawPlace = z.output<typeof RawPlaceSchema>;
