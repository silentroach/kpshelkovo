import { dateTimeFromParts, padNumber } from '@shelkovo/format';
import { z } from 'astro/zod';

import type { ContentDate, ContentDateTime } from './types';

const LOCAL_DATE =
  /^(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{4})(?: (?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d))?$/;
const ISO_DATE = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const contentDateInput = z.union([z.string().trim(), z.date()]);

const timeLabel = (hour: number, minute: number): string =>
  `${padNumber(hour, 2)}:${padNumber(minute, 2)}`;

const normalizeContentDate = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  return undefined;
};

const buildContentDate = (input: {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: number;
  readonly minute: number;
  readonly hasTime: boolean;
}): ContentDate | undefined => {
  const zoned = dateTimeFromParts({
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: input.hour,
    minute: input.minute,
  });

  if (!zoned.isValid) {
    return undefined;
  }

  const iso = zoned.toISO({ suppressMilliseconds: true });
  if (!iso) {
    return undefined;
  }

  return {
    year: input.year,
    month: input.month,
    day: input.day,
    at: zoned.toJSDate(),
    iso,
    hasTime: input.hasTime,
    time: input.hasTime ? timeLabel(input.hour, input.minute) : undefined,
  };
};

export const parseContentDate = (value: unknown): ContentDate | undefined => {
  const normalized = normalizeContentDate(value);
  if (!normalized) {
    return undefined;
  }

  const local = normalized.match(LOCAL_DATE);
  if (local?.groups) {
    return buildContentDate({
      year: local.groups.year,
      month: local.groups.month,
      day: local.groups.day,
      hour: Number(local.groups.hour ?? '0'),
      minute: Number(local.groups.minute ?? '0'),
      hasTime: !!local.groups.hour,
    });
  }

  const iso = normalized.match(ISO_DATE);
  if (!iso?.groups) {
    return undefined;
  }

  return buildContentDate({
    year: iso.groups.year,
    month: iso.groups.month,
    day: iso.groups.day,
    hour: 0,
    minute: 0,
    hasTime: false,
  });
};

export const contentDateSchema = (name: string) =>
  contentDateInput.transform((value, ctx): ContentDate => {
    const parsed = parseContentDate(value);
    if (parsed) {
      return parsed;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD`,
    });

    return z.NEVER;
  });

export const contentDateTimeSchema = (name: string) =>
  contentDateInput.transform((value, ctx): ContentDateTime => {
    const parsed = parseContentDate(value);
    if (parsed?.hasTime && parsed.time) {
      return {
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        at: parsed.at,
        iso: parsed.iso,
        hasTime: true,
        time: parsed.time,
      };
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} must use dd.mm.yyyy hh:mm and include time`,
    });

    return z.NEVER;
  });
