import { compareRuText } from '@shelkovo/format';

import type {
  StatusTimelineDay,
  StatusTimelineIncidentInput,
  StatusTimelineRecord
} from './timeline.types';
import type { StatusIncident } from './types';

// Kept as a type export for existing component consumers.
export type { StatusTimelineIncidentInput } from './timeline.types';

export const toStatusTimelineIncidentInput = (
  incident: StatusIncident
): StatusTimelineIncidentInput => ({
  id: incident.id,
  href: incident.hasPage ? incident.url : undefined,
  title: incident.title,
  kind: incident.kind,
  startedIso: incident.started.iso,
  startedHasTime: incident.started.hasTime,
  endedIso: incident.ended?.iso,
  endedHasTime: incident.ended?.hasTime ?? false,
  phase: incident.phase,
  areas: incident.appliesToAllAreas ? undefined : incident.areas,
  duration: incident.duration
});

const DAY_MS = 24 * 60 * 60 * 1000;
const calendarDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const moscowDateKey = (timestamp: number): string => {
  const parts = calendarDate.formatToParts(timestamp);
  const year = parts.find((part) => part.type === 'year')!.value.padStart(4, '0');
  const month = parts.find((part) => part.type === 'month')!.value;
  const day = parts.find((part) => part.type === 'day')!.value;
  return `${year}-${month}-${day}`;
};

export const buildStatusTimelineDays = (
  records: readonly Pick<StatusTimelineRecord, 'id' | 'kind' | 'startedIso' | 'endedIso'>[],
  nowMs: number,
  count: number
): readonly StatusTimelineDay[] => {
  if (!Number.isFinite(nowMs) || !Number.isInteger(count) || count < 1) {
    throw new Error('Invalid status timeline window');
  }
  const today = moscowDateKey(nowMs);
  // UTC here represents a calendar date, not a real Moscow midnight.
  const first = Date.parse(`${today}T00:00:00Z`) - (count - 1) * DAY_MS;
  const intervals = [...new Map(records.map((record) => [record.id, record])).values()]
    .flatMap((record) => {
      const start = Date.parse(record.startedIso);
      const end = record.endedIso ? Date.parse(record.endedIso) : undefined;
      if (start > nowMs || (end !== undefined && end <= start)) return [];
      return [
        {
          id: record.id,
          kind: record.kind,
          start,
          firstDay: moscowDateKey(start),
          lastDay: end === undefined ? today : moscowDateKey(end - 1)
        }
      ];
    })
    .toSorted((a, b) => a.start - b.start || compareRuText(a.id, b.id));

  return Array.from({ length: count }, (_, index) => {
    const id = new Date(first + index * DAY_MS).toISOString().slice(0, 10);
    const entries = intervals.filter((record) => record.firstDay <= id && id <= record.lastDay);
    return {
      id,
      tone: entries.some((record) => record.kind === 'incident')
        ? 'red'
        : entries.length
          ? 'amber'
          : 'green',
      recordIds: entries.map((record) => record.id)
    };
  });
};

const fullDate = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});
const shortDate = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  day: 'numeric',
  month: 'short'
});
export const formatTimelineDate = (id: string, short = false): string =>
  (short ? shortDate : fullDate).format(new Date(`${id}T12:00:00+03:00`));

export const formatTimelineDay = (
  day: StatusTimelineDay,
  records: readonly StatusTimelineRecord[]
): string =>
  `${formatTimelineDate(day.id)} · ${
    day.recordIds.length
      ? records
          .filter((record) => day.recordIds.includes(record.id))
          .map(
            (record) =>
              `${record.kind === 'maintenance' ? 'Плановые работы' : 'Инцидент'}: ${record.title}`
          )
          .join('. ')
      : 'Нет записей'
  }`;
