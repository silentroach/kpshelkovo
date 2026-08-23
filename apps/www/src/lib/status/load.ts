import { dateTimeFromISO } from '@shelkovo/format';
import type { CollectionEntry } from 'astro:content';

import { compareRuText } from '@shelkovo/format';

import type { SiteMentionRegistry } from '../mentions';
import { loadSiteMentionRegistry } from '../mentions/registry';
import { mapRawStatusIncident } from './mapper';
import { STATUS_SERVICES, type StatusService } from './schema';
import type {
  StatusDataset,
  StatusDaysWithoutIncidents,
  StatusIncident,
  StatusServiceSummary,
} from './types';

export type StatusIncidentEntry = Pick<
  CollectionEntry<'statusIncidents'>,
  'id' | 'data' | 'body'
>;

let cache: Promise<StatusDataset> | undefined;

function compareIncidentsDesc(a: StatusIncident, b: StatusIncident): number {
  const change = b.sortLastChangeAt - a.sortLastChangeAt;

  if (change) {
    return change;
  }

  const start = b.sortStartedAt - a.sortStartedAt;

  if (start) {
    return start;
  }

  return compareRuText(a.id, b.id);
}

function daysWithoutIncidents(
  incidents: readonly StatusIncident[],
  now: Date,
): StatusDaysWithoutIncidents {
  const activeIncident = incidents.find(
    (item) => item.kind === 'incident' && item.isActive,
  );

  if (activeIncident) {
    return { mode: 'activeIncident' };
  }

  const latest = incidents.find(
    (item) => item.kind === 'incident' && item.ended,
  );

  if (!latest?.ended) {
    return { mode: 'noIncidents' };
  }

  const today = dateTimeFromISO(now.toISOString()).startOf('day');
  const last = dateTimeFromISO(latest.ended.iso).startOf('day');

  return {
    mode: 'count',
    days: Math.max(0, Math.floor(today.diff(last, 'days').days)),
    lastEndedIso: latest.ended.iso,
  };
}

function serviceSummary(
  service: StatusService,
  incidents: readonly StatusIncident[],
  now: Date,
): StatusServiceSummary {
  const list = incidents.filter((item) => item.service === service);
  const activeIncidents = list.filter(
    (item) => item.kind === 'incident' && item.isActive,
  );
  const activeMaintenance = list.filter(
    (item) => item.kind === 'maintenance' && item.isActive,
  );

  return {
    service,
    serviceStatus:
      activeIncidents.length > 0
        ? 'red'
        : activeMaintenance.length > 0
          ? 'amber'
          : 'green',
    incidents: list,
    activeIncidents,
    activeMaintenance,
    daysWithoutIncidents: daysWithoutIncidents(list, now),
  };
}

export const buildStatusDataset = (
  entries: readonly StatusIncidentEntry[],
  opts?: {
    readonly now?: Date;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): StatusDataset => {
  const now = opts?.now ?? new Date();
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const incidents = entries
    .map((entry) => mapRawStatusIncident(entry, { now, mentionRegistry }))
    .sort(compareIncidentsDesc);
  const services = STATUS_SERVICES.map((service) =>
    serviceSummary(service, incidents, now),
  );

  return {
    incidents,
    active: incidents.filter((item) => item.isActive),
    services,
    byId: new Map(incidents.map((item) => [item.id, item])),
    byService: new Map(services.map((item) => [item.service, item])),
  };
};

export const loadStatusData = (): Promise<StatusDataset> => {
  cache ??= Promise.all([
    import('astro:content').then(
      ({ getCollection }) =>
        getCollection('statusIncidents') as Promise<
          readonly StatusIncidentEntry[]
        >,
    ),
    loadSiteMentionRegistry(),
  ]).then(([entries, mentionRegistry]) =>
    buildStatusDataset(entries, { mentionRegistry }),
  );

  return cache;
};

export const loadStatusIncidents = async (): Promise<
  readonly StatusIncident[]
> => (await loadStatusData()).incidents;

export const loadActiveStatusIncidents = async (): Promise<
  readonly StatusIncident[]
> => (await loadStatusData()).active;

export const loadStatusServices = async (): Promise<
  readonly StatusServiceSummary[]
> => (await loadStatusData()).services;

export const loadStatusIncident = async (
  id: string,
): Promise<StatusIncident | undefined> => (await loadStatusData()).byId.get(id);

export const loadStatusService = async (
  service: StatusService,
): Promise<StatusServiceSummary | undefined> =>
  (await loadStatusData()).byService.get(service);
