import { renderEventIcs } from '@shelkovo/ical';
import { extractMarkdownText } from '@shelkovo/markdown';

import type { EventRecord } from './types';

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const buildEventIcs = (
  event: EventRecord,
  siteUrl: string,
  stamp: Date,
  url = event.url
): string => {
  if (!event.startsAt && !event.through) {
    throw new Error(`event "${event.id}" has no calendar export: time is unknown`);
  }
  const fields = {
    uid: event.calendarUid,
    prodId: `-//${new URL(siteUrl).host}//Events//RU`,
    timestamp: stamp,
    title: event.title,
    description: [
      event.status === 'cancelled'
        ? 'Отменено.'
        : event.status === 'conditional'
          ? 'При наборе группы.'
          : '',
      extractMarkdownText(event.body),
      event.locationDetails,
      event.startsAt && !event.endsAt
        ? 'Точное окончание неизвестно. Два часа выделены условно для личного календаря.'
        : ''
    ]
      .filter(Boolean)
      .join('\n\n'),
    url: new URL(url, siteUrl).href,
    status:
      event.status === 'cancelled'
        ? ('CANCELLED' as const)
        : event.status === 'conditional'
          ? ('TENTATIVE' as const)
          : ('CONFIRMED' as const),
    location:
      event.location || event.coordinates
        ? {
            name: event.location ?? 'Место на карте',
            address: event.place?.address,
            latitude: event.coordinates?.lat,
            longitude: event.coordinates?.lng
          }
        : undefined
  };
  if (event.startsAt) {
    return renderEventIcs({
      ...fields,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? new Date(event.startsAt.valueOf() + DEFAULT_EVENT_DURATION_MS)
    });
  }
  // ICS DATE has a four-digit year; duration preserves the final supported day.
  if (event.through === '9999-12-31') {
    return renderEventIcs({
      ...fields,
      timePrecision: 'date',
      startsOn: event.startsDate,
      durationDays: (Date.parse(event.through) - Date.parse(event.startsDate)) / DAY_MS + 1
    });
  }
  return renderEventIcs({
    ...fields,
    timePrecision: 'date',
    startsOn: event.startsDate,
    endsOn: new Date(Date.parse(`${event.through}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)
  });
};
