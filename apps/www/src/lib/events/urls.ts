import type { EventMonthView } from './types';

export const eventMonthUrl = (month: string, view: EventMonthView = 'calendar'): string =>
  `/events/${month.replace('-', '/')}/${view === 'list' ? 'list/' : ''}`;

export const eventDayUrl = (date: string): string => `/events/${date.replaceAll('-', '/')}/`;
export const eventReferenceKey = (date: string, slug: string): string =>
  `${date.slice(0, 7).replace('-', '/')}/${slug}`;
export const eventDetailUrl = (date: string, slug: string): string =>
  `/events/${eventReferenceKey(date, slug)}/`;
export const eventUrl = (date: string, id: string): string => `${eventDayUrl(date)}#${id}`;
export const eventCalendarUrl = (id: string): string => `/events/calendar/${id}.ics`;
