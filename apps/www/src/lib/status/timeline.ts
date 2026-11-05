import { compareRuText, dateTimeFromISO } from '@shelkovo/format';

import { buildStatusCalendarProjection } from './calendar';
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

export const statusTimelineStart = (nowMs: number, days: number) =>
  dateTimeFromISO(new Date(nowMs).toISOString())
    .startOf('day')
    .minus({ days: days - 1 });

export const buildStatusTimelineDays = (
  records: readonly Pick<StatusTimelineRecord, 'id' | 'kind' | 'startedIso' | 'endedIso'>[],
  nowMs: number,
  count: number
): readonly StatusTimelineDay[] => {
  if (!Number.isFinite(nowMs) || !Number.isInteger(count) || count < 1) {
    throw new Error('Invalid status timeline window');
  }
  const first = statusTimelineStart(nowMs, count);
  const startMs = first.toMillis();
  const endMs = first.plus({ days: count }).toMillis();
  const starts = new Map(records.map((record) => [record.id, Date.parse(record.startedIso)]));
  const calendar = buildStatusCalendarProjection(
    records.flatMap((record) => {
      const start = Date.parse(record.startedIso);
      const end = record.endedIso ? Date.parse(record.endedIso) : endMs;
      if (start > nowMs || end <= start || end <= startMs) return [];
      return [
        {
          id: record.id,
          kind: record.kind,
          startedAt: Math.max(start, startMs),
          endedAt: Math.min(end, endMs)
        }
      ];
    }),
    nowMs
  );
  return Array.from({ length: count }, (_, index) => {
    const id = first.plus({ days: index }).toISODate()!;
    const day = calendar.byDay.get(id);
    return {
      id,
      tone: !day ? 'green' : day.kind === 'maintenance' ? 'amber' : 'red',
      recordIds: (day?.recordIds ?? []).toSorted(
        (a, b) => starts.get(a)! - starts.get(b)! || compareRuText(a, b)
      )
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

export const formatTimelineCount = (count: number): string => {
  const mod100 = count % 100;
  const mod10 = count % 10;
  return `${count} ${mod100 >= 11 && mod100 <= 14 ? 'событий' : mod10 === 1 ? 'событие' : mod10 >= 2 && mod10 <= 4 ? 'события' : 'событий'}`;
};

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
