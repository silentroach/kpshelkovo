import type { PlaceOpeningHoursRow } from './opening-hours-types';
import { PLACE_WEEKDAYS, type PlaceWeekday } from './schema';
import type { PlaceOpeningHours } from './types';

export const PLACE_TIME_ZONE = 'Europe/Moscow';
const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

export const formatPlaceOpeningHours = (
  openingHours: PlaceOpeningHours
): readonly PlaceOpeningHoursRow[] => {
  const week = PLACE_WEEKDAYS.map((day) =>
    openingHours.periods
      .filter((period) => period.days.includes(day))
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
      .map((period) => `${period.opensAt}–${period.closesAt}`)
      .join(', ')
  );
  const rows: PlaceOpeningHoursRow[] = [];

  for (let start = 0; start < week.length;) {
    let end = start;
    while (end + 1 < week.length && week[end + 1] === week[start]) end++;

    const days =
      start === 0 && end === 6
        ? 'Ежедневно'
        : start === end
          ? WEEKDAY_LABELS[start]!
          : `${WEEKDAY_LABELS[start]}–${WEEKDAY_LABELS[end]}`;
    rows.push({ days, hours: week[start] || 'выходной', closed: !week[start] });
    start = end + 1;
  }

  return rows;
};
const WEEKDAY_BY_SHORT_NAME = new Map<string, PlaceWeekday>([
  ['Mon', 'mon'],
  ['Tue', 'tue'],
  ['Wed', 'wed'],
  ['Thu', 'thu'],
  ['Fri', 'fri'],
  ['Sat', 'sat'],
  ['Sun', 'sun']
]);
const PLACE_DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: PLACE_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

const minutesFromTime = (time: string): number => {
  const [hour = '0', minute = '0'] = time.split(':');

  return Number(hour) * 60 + Number(minute);
};

const placeLocalTime = (
  date: Date
): { readonly weekday: PlaceWeekday; readonly minutes: number } => {
  const parts = new Map(
    PLACE_DATE_TIME_FORMAT.formatToParts(date).map((part) => [part.type, part.value])
  );
  const weekday = WEEKDAY_BY_SHORT_NAME.get(parts.get('weekday') ?? '');

  if (!weekday) {
    throw new Error('Could not determine the weekday in Europe/Moscow');
  }

  return {
    weekday,
    minutes: Number(parts.get('hour') ?? '0') * 60 + Number(parts.get('minute') ?? '0')
  };
};

export const getPlaceClosingTime = (
  openingHours: PlaceOpeningHours,
  date = new Date()
): string | undefined => {
  const localTime = placeLocalTime(date);

  return openingHours.periods.find(
    (period) =>
      period.days.includes(localTime.weekday) &&
      localTime.minutes >= minutesFromTime(period.opensAt) &&
      localTime.minutes < minutesFromTime(period.closesAt)
  )?.closesAt;
};

export const isPlaceOpen = (openingHours: PlaceOpeningHours, date = new Date()): boolean =>
  Boolean(getPlaceClosingTime(openingHours, date));
