import { selectEventStartMonth } from './calendar-projection';
import { loadEventsData } from './load';
import type { EventsBuildData } from './public-types';

// All root representations share this clock and selection within the build.
const now = new Date();
let cache: Promise<EventsBuildData> | undefined;

export const loadEventsBuildData = (): Promise<EventsBuildData> => {
  cache ??= loadEventsData().then((data) => ({
    data,
    now,
    startMonth: selectEventStartMonth(data.calendar, now)
  }));
  return cache;
};
