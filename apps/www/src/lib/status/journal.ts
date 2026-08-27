import { statusCalendarMonthId } from './calendar';
import type { StatusMonthJournal } from './journal.types';
import type { StatusDataset, StatusIncident } from './types';

const resolveIncident = (
  incidentsById: ReadonlyMap<string, StatusIncident>,
  recordId: string,
): StatusIncident => {
  const incident = incidentsById.get(recordId);

  if (!incident) {
    throw new Error(`status calendar record "${recordId}" not found`);
  }

  return incident;
};

export const getStatusMonthJournal = (
  data: Pick<StatusDataset, 'calendar' | 'byId'>,
  year: number,
  month: number,
): StatusMonthJournal | undefined => {
  const calendarMonth = data.calendar.byMonth.get(
    statusCalendarMonthId(year, month),
  );

  if (!calendarMonth) {
    return;
  }

  return {
    id: calendarMonth.id,
    year: calendarMonth.year,
    month: calendarMonth.month,
    days: calendarMonth.days.map((day) => ({
      day,
      incidents: day.recordIds.map((recordId) =>
        resolveIncident(data.byId, recordId),
      ),
    })),
  };
};
