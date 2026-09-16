import { dateTimeFromISO, formatDate, formatMonth } from '@shelkovo/format';

import { formatArea } from '../areas';
import type { NewsArea } from './schema';
import type { NewsAuthor, NewsEvent } from './types';

export const NEWS_PROSE = 'ui-prose';

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
};

const formatNewsCalendarDate = (iso: string): string =>
  dateTimeFromISO(iso).toFormat('d MMMM yyyy');

const formatNewsTime = (iso: string): string => dateTimeFromISO(iso).toFormat('HH:mm');

const isSameNewsDay = (startIso: string, endIso: string): boolean =>
  dateTimeFromISO(startIso).hasSame(dateTimeFromISO(endIso), 'day');

export const formatNewsDate = (value: string): string => formatDate(value);

export const formatNewsMonth = (
  year: number,
  month: number,
  opts?: {
    readonly capitalize?: boolean;
    readonly includeYear?: boolean;
  }
): string => {
  const label = formatMonth(year, month, {
    includeYear: opts?.includeYear
  });

  return opts?.capitalize ? capitalize(label) : label;
};

export const formatNewsArea = (area: NewsArea): string => formatArea(area);

export const formatNewsAuthor = (
  author: Pick<NewsAuthor, 'name' | 'shortName'>,
  opts?: {
    readonly short?: boolean;
  }
): string => (opts?.short === false ? author.name : (author.shortName ?? author.name));

export const formatNewsDateTime = (iso: string, time?: string): string =>
  `${formatNewsCalendarDate(iso)}, ${time ?? formatNewsTime(iso)}`;

export const formatNewsEventMonth = (iso: string): string => dateTimeFromISO(iso).toFormat('MMMM');

export const formatNewsEventRange = (
  event: Pick<NewsEvent, 'startsIso' | 'startsTime' | 'endsIso' | 'endsTime' | 'through'>
): string => {
  if (event.through) {
    return `${formatNewsCalendarDate(event.startsIso)} – ${formatNewsCalendarDate(event.through)}`;
  }
  if (!event.startsTime) return `${formatNewsCalendarDate(event.startsIso)}, время уточняется`;
  if (!event.endsIso || !event.endsTime) {
    return formatNewsDateTime(event.startsIso, event.startsTime);
  }

  if (isSameNewsDay(event.startsIso, event.endsIso)) {
    return `${formatNewsCalendarDate(event.startsIso)}, ${event.startsTime}-${event.endsTime}`;
  }

  return `${formatNewsDateTime(event.startsIso, event.startsTime)} - ${formatNewsDateTime(event.endsIso, event.endsTime)}`;
};

export const buildNewsEventMapUrl = (
  event: Pick<NewsEvent, 'place' | 'coordinates' | 'location'>
): string | undefined => {
  if (event.place) return event.place.mapUrl;
  if (event.coordinates)
    return `https://yandex.ru/maps/?pt=${event.coordinates.lng},${event.coordinates.lat}&z=16&l=map`;
  if (event.location)
    return `https://yandex.ru/maps/?text=${encodeURIComponent(event.location)}&z=16&l=map`;
  return;
};
