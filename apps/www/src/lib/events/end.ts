const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Точное окончание или резервный интервал двух часов для экспортных форматов. */
export const eventExportEnd = (startsAt: Date, endsAt?: Date): Date =>
  endsAt ?? new Date(startsAt.valueOf() + DEFAULT_EVENT_DURATION_MS);
