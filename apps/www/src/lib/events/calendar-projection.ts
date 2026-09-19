import { dateTimeFromISO } from '@shelkovo/format';

import type {
  EventCalendarProjection,
  EventDay,
  EventMonth,
  EventMonthView,
  EventRecord
} from './types';
import { eventDayUrl, eventMonthUrl } from './urls';

const compareIds = (a: EventRecord, b: EventRecord): number => a.id.localeCompare(b.id, 'en');
const compareDayEvents = (a: EventRecord, b: EventRecord): number =>
  (a.startsTime ?? '').localeCompare(b.startsTime ?? '') || compareIds(a, b);

export const buildEventCalendar = (events: readonly EventRecord[]): EventCalendarProjection => {
  const byDate = new Map<string, EventRecord[]>();
  for (const event of events) {
    const date = new Date(`${event.startsDate}T00:00:00Z`);
    const last = event.through ?? event.startsDate;
    for (let day = event.startsDate; day <= last; day = date.toISOString().slice(0, 10)) {
      const entries = byDate.get(day) ?? [];
      entries.push(event);
      byDate.set(day, entries);
      if (day === last) break;
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }
  const days: EventDay[] = [...byDate]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({
      date,
      url: eventDayUrl(date),
      events: entries.sort(compareDayEvents)
    }));
  const monthDays = new Map<string, EventDay[]>();
  for (const day of days) {
    const id = day.date.slice(0, 7);
    const entries = monthDays.get(id) ?? [];
    entries.push(day);
    monthDays.set(id, entries);
  }
  const months: EventMonth[] = [...monthDays].map(([id, entries]) => ({
    id,
    year: Number(id.slice(0, 4)),
    month: Number(id.slice(5, 7)),
    days: entries,
    events: [
      ...new Map(
        entries.flatMap((day) => day.events.map((event) => [event.id, event] as const))
      ).values()
    ]
  }));
  return {
    months,
    days,
    byMonth: new Map(months.map((month) => [month.id, month])),
    byDay: new Map(days.map((day) => [day.date, day]))
  };
};

export const selectEventStartMonth = (
  calendar: EventCalendarProjection,
  now: Date
): EventMonth | undefined => {
  const current = dateTimeFromISO(now.toISOString()).toFormat('yyyy-MM');
  return calendar.months.find((month) => month.id >= current) ?? calendar.months.at(-1);
};

export const eventMonthNavigation = (
  calendar: EventCalendarProjection,
  month: string,
  view: EventMonthView = 'calendar'
): { readonly previous?: string; readonly next?: string } => {
  const index = calendar.months.findIndex((entry) => entry.id === month);
  const previous = index > 0 ? calendar.months[index - 1] : undefined;
  const next = index >= 0 ? calendar.months[index + 1] : undefined;
  return {
    previous: previous ? eventMonthUrl(previous.id, view) : undefined,
    next: next ? eventMonthUrl(next.id, view) : undefined
  };
};
