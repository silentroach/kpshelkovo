import { compareRuText, dateTimeFromISO, padNumber } from '@shelkovo/format';

import type {
  StatusCalendarDay,
  StatusCalendarDayBucket,
  StatusCalendarDayKind,
  StatusCalendarMonth,
  StatusCalendarProjection,
  StatusCalendarRecordInput,
  StatusCalendarYear,
} from './calendar.types';
import type { StatusIncident } from './types';

const toMoscowDateTime = (timestamp: number) =>
  dateTimeFromISO(new Date(timestamp).toISOString());

const dayId = (year: number, month: number, day: number): string =>
  `${year}-${padNumber(month)}-${padNumber(day)}`;

export const statusCalendarMonthId = (year: number, month: number): string =>
  `${year}/${padNumber(month)}`;

const assertFiniteTimestamp = (value: number, context: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${context} must be a finite timestamp`);
  }
};

const sameRecord = (
  first: StatusCalendarRecordInput,
  second: StatusCalendarRecordInput,
): boolean =>
  first.kind === second.kind &&
  first.startedAt === second.startedAt &&
  first.endedAt === second.endedAt;

const uniqueRecords = (
  records: readonly StatusCalendarRecordInput[],
): readonly StatusCalendarRecordInput[] => {
  const byId = new Map<string, StatusCalendarRecordInput>();

  for (const record of records) {
    assertFiniteTimestamp(
      record.startedAt,
      `status calendar record "${record.id}" startedAt`,
    );

    if (record.endedAt !== undefined) {
      assertFiniteTimestamp(
        record.endedAt,
        `status calendar record "${record.id}" endedAt`,
      );

      if (record.endedAt < record.startedAt) {
        throw new Error(
          `status calendar record "${record.id}" cannot end before it starts`,
        );
      }
    }

    const existing = byId.get(record.id);

    if (existing && !sameRecord(existing, record)) {
      throw new Error(
        `status calendar record "${record.id}" has conflicting intervals`,
      );
    }

    byId.set(record.id, record);
  }

  return [...byId.values()];
};

const effectiveEndMs = (
  record: StatusCalendarRecordInput,
  buildNowMs: number,
): number => {
  if (record.endedAt !== undefined) {
    return record.endedAt;
  }

  const lastIncludedDay = Math.max(record.startedAt, buildNowMs);

  return toMoscowDateTime(lastIncludedDay)
    .startOf('day')
    .plus({ days: 1 })
    .toMillis();
};

const addRecordDays = (
  buckets: Map<string, StatusCalendarDayBucket>,
  record: StatusCalendarRecordInput,
  buildNowMs: number,
): void => {
  const endMs = effectiveEndMs(record, buildNowMs);

  if (endMs <= record.startedAt) {
    return;
  }

  let date = toMoscowDateTime(record.startedAt).startOf('day');

  while (date.toMillis() < endMs) {
    const nextDate = date.plus({ days: 1 });
    const startMs = date.toMillis();
    const nextStartMs = nextDate.toMillis();

    if (Math.max(record.startedAt, startMs) < Math.min(endMs, nextStartMs)) {
      const id = dayId(date.year, date.month, date.day);
      const bucket = buckets.get(id) ?? {
        id,
        year: date.year,
        month: date.month,
        day: date.day,
        startMs,
        records: new Map(),
      };

      bucket.records.set(record.id, record);
      buckets.set(id, bucket);
    }

    date = nextDate;
  }
};

const dayKind = (
  incidentCount: number,
  maintenanceCount: number,
): StatusCalendarDayKind => {
  if (incidentCount && maintenanceCount) {
    return 'mixed';
  }

  return incidentCount ? 'incident' : 'maintenance';
};

const buildDay = (bucket: StatusCalendarDayBucket): StatusCalendarDay => {
  const records = [...bucket.records.values()].sort((first, second) => {
    const firstGroup = first.startedAt < bucket.startMs ? 0 : 1;
    const secondGroup = second.startedAt < bucket.startMs ? 0 : 1;

    return (
      firstGroup - secondGroup ||
      first.startedAt - second.startedAt ||
      compareRuText(first.id, second.id)
    );
  });
  const incidentCount = records.filter(
    (record) => record.kind === 'incident',
  ).length;
  const maintenanceCount = records.length - incidentCount;

  return {
    id: bucket.id,
    year: bucket.year,
    month: bucket.month,
    day: bucket.day,
    kind: dayKind(incidentCount, maintenanceCount),
    incidentCount,
    maintenanceCount,
    recordIds: records.map((record) => record.id),
  };
};

const buildMonths = (
  days: readonly StatusCalendarDay[],
): readonly StatusCalendarMonth[] => {
  const daysByMonth = new Map<string, StatusCalendarDay[]>();

  for (const day of days) {
    const id = statusCalendarMonthId(day.year, day.month);
    const monthDays = daysByMonth.get(id) ?? [];

    monthDays.push(day);
    daysByMonth.set(id, monthDays);
  }

  return [...daysByMonth.entries()].map(([id, monthDays]) => {
    const firstDay = monthDays[0];

    if (!firstDay) {
      throw new Error(`status calendar month "${id}" has no days`);
    }

    return {
      id,
      year: firstDay.year,
      month: firstDay.month,
      days: monthDays,
    };
  });
};

const buildYears = (
  months: readonly StatusCalendarMonth[],
): readonly StatusCalendarYear[] => {
  const monthsByYear = new Map<number, StatusCalendarMonth[]>();

  for (const month of months) {
    const yearMonths = monthsByYear.get(month.year) ?? [];

    yearMonths.push(month);
    monthsByYear.set(month.year, yearMonths);
  }

  return [...monthsByYear.entries()].map(([year, yearMonths]) => ({
    year,
    months: yearMonths,
  }));
};

export const toStatusCalendarRecord = (
  incident: StatusIncident,
): StatusCalendarRecordInput => ({
  id: incident.id,
  kind: incident.kind,
  startedAt: incident.started.at.valueOf(),
  endedAt: incident.ended?.at.valueOf(),
});

export const buildStatusCalendarProjection = (
  records: readonly StatusCalendarRecordInput[],
  buildNowMs: number,
): StatusCalendarProjection => {
  assertFiniteTimestamp(buildNowMs, 'status calendar buildNowMs');

  const buckets = new Map<string, StatusCalendarDayBucket>();

  for (const record of uniqueRecords(records)) {
    addRecordDays(buckets, record, buildNowMs);
  }

  const days = [...buckets.values()]
    .sort((first, second) => second.startMs - first.startMs)
    .map(buildDay);
  const months = buildMonths(days);
  const years = buildYears(months);

  return {
    years,
    byYear: new Map(years.map((year) => [year.year, year])),
    byMonth: new Map(months.map((month) => [month.id, month])),
    byDay: new Map(days.map((day) => [day.id, day])),
  };
};
