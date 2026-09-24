import { DateTime } from 'luxon';

const DATE_LOCALE = 'ru';
const DATE_ZONE = 'Europe/Moscow';
let dateFormatter: Intl.DateTimeFormat | undefined;

export interface DateTimeFromPartsInput {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
}

export const dateTimeFromISO = (iso: string): DateTime =>
  DateTime.fromISO(iso, {
    locale: DATE_LOCALE,
    zone: DATE_ZONE
  });

export const dateTimeFromParts = (input: DateTimeFromPartsInput): DateTime =>
  DateTime.fromObject(
    {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour ?? 0,
      minute: input.minute ?? 0,
      second: input.second ?? 0
    },
    {
      locale: DATE_LOCALE,
      zone: DATE_ZONE
    }
  );

const monthDateTime = (year: number, month: number): DateTime =>
  dateTimeFromParts({ year, month, day: 1 });

/**
 * Formats ISO date into Russian human-readable form.
 */
export const formatDate = (iso: string): string => {
  // An ISO timestamp without an offset is a Moscow wall date, not a browser-local instant.
  const value = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : iso.slice(0, 10);
  dateFormatter ??= new Intl.DateTimeFormat(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DATE_ZONE
  });
  return dateFormatter
    .formatToParts(new Date(value))
    .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
    .map((part) => part.value)
    .join(' ');
};

/**
 * Formats year and month in Russian.
 */
export function formatMonth(
  year: number,
  month: number,
  opts?: {
    readonly includeYear?: boolean;
  }
): string {
  return monthDateTime(year, month).toFormat(opts?.includeYear === false ? 'LLLL' : 'LLLL yyyy г.');
}
