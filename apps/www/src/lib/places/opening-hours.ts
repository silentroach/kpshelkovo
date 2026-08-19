import type { PlaceWeekday } from './schema';
import type { PlaceOpeningHours } from './types';

const PLACE_TIME_ZONE = 'Europe/Moscow';
const WEEKDAY_BY_SHORT_NAME = new Map<string, PlaceWeekday>([
  ['Mon', 'mon'],
  ['Tue', 'tue'],
  ['Wed', 'wed'],
  ['Thu', 'thu'],
  ['Fri', 'fri'],
  ['Sat', 'sat'],
  ['Sun', 'sun'],
]);
const PLACE_DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: PLACE_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const minutesFromTime = (time: string): number => {
  const [hour = '0', minute = '0'] = time.split(':');

  return Number(hour) * 60 + Number(minute);
};

const placeLocalTime = (
  date: Date,
): { readonly weekday: PlaceWeekday; readonly minutes: number } => {
  const parts = new Map(
    PLACE_DATE_TIME_FORMAT.formatToParts(date).map((part) => [
      part.type,
      part.value,
    ]),
  );
  const weekday = WEEKDAY_BY_SHORT_NAME.get(parts.get('weekday') ?? '');

  if (!weekday) {
    throw new Error('Could not determine the weekday in Europe/Moscow');
  }

  return {
    weekday,
    minutes:
      Number(parts.get('hour') ?? '0') * 60 +
      Number(parts.get('minute') ?? '0'),
  };
};

export const isPlaceOpen = (
  openingHours: PlaceOpeningHours,
  date = new Date(),
): boolean => {
  const localTime = placeLocalTime(date);

  return openingHours.periods.some(
    (period) =>
      period.days.includes(localTime.weekday) &&
      localTime.minutes >= minutesFromTime(period.opensAt) &&
      localTime.minutes < minutesFromTime(period.closesAt),
  );
};
