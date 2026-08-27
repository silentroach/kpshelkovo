import type { StatusKind } from './schema';

export interface StatusCalendarRecordInput {
  readonly id: string;
  readonly kind: StatusKind;
  readonly startedAt: number;
  readonly endedAt?: number;
}

export type StatusCalendarDayKind = StatusKind | 'mixed';

export interface StatusCalendarDay {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly kind: StatusCalendarDayKind;
  readonly incidentCount: number;
  readonly maintenanceCount: number;
  readonly recordIds: readonly string[];
}

export interface StatusCalendarMonth {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly days: readonly StatusCalendarDay[];
}

export interface StatusCalendarYear {
  readonly year: number;
  readonly months: readonly StatusCalendarMonth[];
}

export interface StatusCalendarProjection {
  readonly years: readonly StatusCalendarYear[];
  readonly byYear: ReadonlyMap<number, StatusCalendarYear>;
  readonly byMonth: ReadonlyMap<string, StatusCalendarMonth>;
  readonly byDay: ReadonlyMap<string, StatusCalendarDay>;
}

export interface StatusCalendarGridDay {
  readonly id: string;
  readonly day: number;
  readonly isInMonth: boolean;
  readonly isToday: boolean;
  readonly status?: StatusCalendarDay;
}

export interface StatusCalendarMonthGrid {
  readonly year: number;
  readonly month: number;
  readonly name: string;
  readonly weeks: readonly (readonly StatusCalendarGridDay[])[];
}

export interface StatusCalendarYearGrid {
  readonly year: number;
  readonly months: readonly StatusCalendarMonthGrid[];
}

export interface StatusCalendarDayBucket {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly startMs: number;
  readonly records: Map<string, StatusCalendarRecordInput>;
}
