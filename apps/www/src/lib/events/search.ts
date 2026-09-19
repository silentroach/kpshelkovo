import { dateTimeFromISO } from '@shelkovo/format';

import type { EventRecord } from './types';

const RECENT_EVENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const eventLastDate = (event: Pick<EventRecord, 'startsDate' | 'endsIso' | 'through'>): string =>
  event.through ??
  (event.endsIso ? dateTimeFromISO(event.endsIso).toFormat('yyyy-MM-dd') : event.startsDate);

export const isEventSearchable = (
  event: Pick<EventRecord, 'startsDate' | 'endsIso' | 'through'>,
  now = Date.now()
): boolean => {
  const today = dateTimeFromISO(new Date(now).toISOString()).toFormat('yyyy-MM-dd');
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_EVENT_WINDOW_MS / (24 * 60 * 60 * 1000));
  return eventLastDate(event) >= cutoff.toISOString().slice(0, 10);
};
