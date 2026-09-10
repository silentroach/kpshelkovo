import type { StatusIncident } from './types';

const RECENT_EVENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const isStatusIncidentSearchable = (
  incident: Pick<StatusIncident, 'hasPage' | 'ended'>,
  now = Date.now()
): boolean =>
  incident.hasPage &&
  (!incident.ended || incident.ended.at.valueOf() >= now - RECENT_EVENT_WINDOW_MS);
