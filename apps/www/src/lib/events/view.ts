import { dateTimeFromISO, formatDate, formatMonth } from '@shelkovo/format';

import type { EventCategory, EventMonth, EventRecord, EventStatus } from './types';

export const EVENT_CATEGORY_LABELS: Readonly<Record<EventCategory, string>> = {
  sport: 'Спорт',
  workshops: 'Мастер-классы',
  games: 'Игры и квизы',
  celebrations: 'Праздники',
  meetings: 'Собрания и встречи',
  community: 'Соседские дела',
  exhibitions: 'Выставки и экскурсии',
  other: 'Другое'
};

export const EVENT_STATUS_LABELS: Readonly<Record<EventStatus, string>> = {
  announced: 'Анонс',
  conditional: 'При наборе группы',
  cancelled: 'Отменено'
};

const eventPlural = new Intl.PluralRules('ru');
export const formatEventCount = (count: number): string => {
  const plural = eventPlural.select(count);
  return `${count} ${plural === 'one' ? 'событие' : plural === 'few' ? 'события' : 'событий'}`;
};

export const formatEventMonth = (month: EventMonth): string => {
  const label = `${formatMonth(month.year, month.month, { includeYear: false })} ${month.year} года`;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatEventBadgeMonth = (iso: string): string => dateTimeFromISO(iso).toFormat('MMMM');

export const formatEventRange = (
  event: Pick<EventRecord, 'startsDate' | 'startsTime' | 'endsIso' | 'endsTime' | 'through'>
): string => {
  const date = formatDate(event.startsDate);
  if (event.through) return `${date} – ${formatDate(event.through)}, включительно`;
  if (!event.startsTime) return `${date}, время не указано`;
  const start = `${date}, ${event.startsTime}`;
  if (!event.endsIso || !event.endsTime) return start;
  return dateTimeFromISO(event.endsIso).toISODate() === event.startsDate
    ? `${start}–${event.endsTime}`
    : `${start} – ${formatDate(event.endsIso)}, ${event.endsTime}`;
};

export const buildEventMapUrl = (
  event: Pick<EventRecord, 'place' | 'coordinates' | 'location'>
): string | undefined => {
  if (event.place) return event.place.mapUrl;
  if (event.coordinates)
    return `https://yandex.ru/maps/?pt=${event.coordinates.lng},${event.coordinates.lat}&z=16&l=map`;
  if (event.location)
    return `https://yandex.ru/maps/?text=${encodeURIComponent(event.location)}&z=16&l=map`;
  return;
};

export const buildEventMonthCells = (month: EventMonth) => {
  const first = dateTimeFromISO(`${month.id}-01`);
  const gridStart = first.minus({ days: first.weekday - 1 });
  const days = new Map(month.days.map((day) => [day.date, day]));
  return Array.from({ length: 42 }, (_, index) => {
    const value = gridStart.plus({ days: index });
    const date = value.toFormat('yyyy-MM-dd');
    const inMonth = value.year === month.year && value.month === month.month;
    return { number: value.day, date, inMonth, day: inMonth ? days.get(date) : undefined };
  });
};

export const eventPageDescription = (period: string, events: readonly EventRecord[]): string =>
  `${period}: ${formatEventCount(events.length)}. Описания, условия участия, места и источники. Состояние каждого события указано в карточке.`;
