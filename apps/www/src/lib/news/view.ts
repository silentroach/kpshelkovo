import { dateTimeFromISO, formatDate, formatMonth } from '@shelkovo/format';
import { formatArea } from '../areas';
import type { NewsArea } from './schema';
import type { NewsAuthor, NewsEvent } from './types';

const MAP_TILE_SIZE = 256;
const MAP_WIDGET_ZOOM = 16;
const MERCATOR_MAX_LAT = 85.05112878;

export const NEWS_PROSE = 'ui-prose';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
};

const toRad = (value: number): number => (value * Math.PI) / 180;

const toDeg = (value: number): number => (value * 180) / Math.PI;

const toMercatorY = (lat: number): number => {
  const clamped = clamp(lat, -MERCATOR_MAX_LAT, MERCATOR_MAX_LAT);
  const sin = Math.sin(toRad(clamped));

  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};

const fromMercatorY = (y: number): number =>
  toDeg(Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y)));

// Yandex centers `ll` in Web Mercator pixels; offset it when CSS moves the iframe behind a fixed pin.
const shiftMapLatByPixels = (
  lat: number,
  yOffsetPx: number,
  zoom: number,
): number => {
  const worldSize = MAP_TILE_SIZE * 2 ** zoom;

  return fromMercatorY(toMercatorY(lat) + yOffsetPx / worldSize);
};

const formatNewsCalendarDate = (iso: string): string =>
  dateTimeFromISO(iso).toFormat('d MMMM yyyy');

const formatNewsTime = (iso: string): string =>
  dateTimeFromISO(iso).toFormat('HH:mm');

const isSameNewsDay = (startIso: string, endIso: string): boolean =>
  dateTimeFromISO(startIso).hasSame(dateTimeFromISO(endIso), 'day');

export const formatNewsDate = (value: string): string => formatDate(value);

export const formatNewsMonth = (
  year: number,
  month: number,
  opts?: {
    readonly capitalize?: boolean;
    readonly includeYear?: boolean;
  },
): string => {
  const label = formatMonth(year, month, {
    includeYear: opts?.includeYear,
  });

  return opts?.capitalize ? capitalize(label) : label;
};

export const formatNewsArea = (area: NewsArea): string => formatArea(area);

export const formatNewsAuthor = (
  author: Pick<NewsAuthor, 'name' | 'shortName'>,
  opts?: {
    readonly short?: boolean;
  },
): string =>
  opts?.short === false ? author.name : (author.shortName ?? author.name);

export const formatNewsDateTime = (iso: string, time?: string): string =>
  `${formatNewsCalendarDate(iso)}, ${time ?? formatNewsTime(iso)}`;

export const formatNewsEventMonth = (iso: string): string =>
  dateTimeFromISO(iso).toFormat('MMMM');

export const formatNewsEventRange = (
  event: Pick<NewsEvent, 'startsIso' | 'startsTime' | 'endsIso' | 'endsTime'>,
): string => {
  if (!event.endsIso || !event.endsTime) {
    return formatNewsDateTime(event.startsIso, event.startsTime);
  }

  if (isSameNewsDay(event.startsIso, event.endsIso)) {
    return `${formatNewsCalendarDate(event.startsIso)}, ${event.startsTime}-${event.endsTime}`;
  }

  return `${formatNewsDateTime(event.startsIso, event.startsTime)} - ${formatNewsDateTime(event.endsIso, event.endsTime)}`;
};

export const buildNewsEventMapUrl = (
  event: Pick<NewsEvent, 'coordinates' | 'location'>,
): string | undefined => {
  if (event.coordinates) {
    const point = `${event.coordinates.lng},${event.coordinates.lat}`;

    return `https://yandex.ru/maps/?pt=${point}&z=16&l=map`;
  }

  if (event.location) {
    const query = encodeURIComponent(event.location);

    return `https://yandex.ru/maps/?text=${query}&z=16&l=map`;
  }

  return undefined;
};

export const buildNewsEventMapEmbedUrl = (
  event: Pick<NewsEvent, 'coordinates'>,
  opts?: {
    readonly centerOffsetYPx?: number;
  },
): string | undefined => {
  if (!event.coordinates) {
    return undefined;
  }

  const centerOffsetYPx = opts?.centerOffsetYPx;
  const lat =
    centerOffsetYPx !== undefined
      ? shiftMapLatByPixels(
          event.coordinates.lat,
          centerOffsetYPx,
          MAP_WIDGET_ZOOM,
        )
      : event.coordinates.lat;
  const point = `${event.coordinates.lng},${lat}`;
  const params = new URLSearchParams({
    ll: point,
    z: String(MAP_WIDGET_ZOOM),
    l: 'map',
  });

  return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
};
