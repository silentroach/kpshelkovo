import type { StatusCalendarDay } from './calendar.types';
import type { StatusIncident } from './types';

export interface StatusMonthJournalDay {
  readonly day: StatusCalendarDay;
  readonly incidents: readonly StatusIncident[];
}

export interface StatusMonthJournal {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly days: readonly StatusMonthJournalDay[];
}
