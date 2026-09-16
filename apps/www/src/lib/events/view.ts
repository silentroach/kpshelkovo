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
  const label = formatMonth(month.year, month.month);
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatEventRange = (event: EventRecord): string => {
  const date = formatDate(event.startsDate);
  if (event.through) return `${date} – ${formatDate(event.through)}, включительно`;
  if (!event.startsTime) return `${date}, время не указано`;
  const start = `${date}, ${event.startsTime}`;
  if (!event.endsIso || !event.endsTime) return start;
  return dateTimeFromISO(event.endsIso).toISODate() === event.startsDate
    ? `${start}–${event.endsTime}`
    : `${start} – ${formatDate(event.endsIso)}, ${event.endsTime}`;
};

export const buildEventMonthCells = (month: EventMonth) => {
  const first = dateTimeFromISO(`${month.id}-01`);
  const days = new Map(month.days.map((day) => [day.date, day]));
  return Array.from({ length: first.daysInMonth ?? 0 }, (_, index) => {
    const number = index + 1;
    const date = `${month.id}-${String(number).padStart(2, '0')}`;
    return { number, date, column: index === 0 ? first.weekday : undefined, day: days.get(date) };
  });
};

export const eventPageDescription = (period: string, events: readonly EventRecord[]): string =>
  `${period}: ${formatEventCount(events.length)}. Описания, условия участия, места и источники. Состояние каждого события указано в карточке.`;
