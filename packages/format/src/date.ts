import { DateTime } from 'luxon';

const DATE_LOCALE = 'ru';
const DATE_ZONE = 'Europe/Moscow';

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
export function formatDate(iso: string): string {
  return dateTimeFromISO(iso).toFormat('d MMMM yyyy');
}

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
