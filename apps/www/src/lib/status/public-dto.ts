import { absoluteUrl } from '../site';
import type {
  StatusDataset,
  StatusDaysWithoutIncidents,
  StatusDuration,
  StatusIncident,
  StatusServiceSummary,
} from './types';
import { statusServiceMarkdownUrl, statusServiceUrl } from './routes';
import {
  statusPublicPayloadSchema,
  type StatusPublicDaysWithoutIncidentsDto,
  type StatusPublicDaysWithoutIncidentsMode,
  type StatusPublicDurationDto,
  type StatusPublicIncidentDto,
  type StatusPublicIncidentRefDto,
  type StatusPublicPayloadDto,
  type StatusPublicServiceSummaryDto,
} from './public-schema';
import {
  formatStatusDuration,
  formatStatusDaysWithoutIncidents,
  formatStatusKind,
  formatStatusService,
  formatStatusServiceState,
  getStatusIncidentPhase,
} from './view';

export type {
  StatusPublicDaysWithoutIncidentsDto,
  StatusPublicDaysWithoutIncidentsMode,
  StatusPublicDurationDto,
  StatusPublicIncidentDto,
  StatusPublicIncidentPhase,
  StatusPublicIncidentRefDto,
  StatusPublicPayloadDto,
  StatusPublicServiceSummaryDto,
} from './public-schema';

type StatusPublicIncidentLinksDto = Pick<
  StatusPublicIncidentDto,
  'html_url' | 'markdown_url'
>;

const fullUrl = (value: string): string => absoluteUrl(value);

const duration = (item: StatusDuration): StatusPublicDurationDto => ({
  total_minutes: item.totalMinutes,
  human: formatStatusDuration(item),
});

const daysWithoutIncidentsMode = (
  mode: StatusDaysWithoutIncidents['mode'],
): StatusPublicDaysWithoutIncidentsMode => {
  switch (mode) {
    case 'activeIncident':
      return 'active_incident';
    case 'noIncidents':
      return 'no_incidents';
    case 'count':
      return 'count';
  }
};

const incidentLinks = (item: StatusIncident): StatusPublicIncidentLinksDto => ({
  html_url: item.hasPage ? item.canonical : undefined,
  markdown_url: item.hasPage ? fullUrl(item.markdownUrl) : undefined,
});

function incidentRef(item: StatusIncident): StatusPublicIncidentRefDto {
  const current = getStatusIncidentPhase(item);
  const links = incidentLinks(item);

  return {
    id: item.id,
    title: item.title,
    html_url: links.html_url,
    markdown_url: links.markdown_url,
    phase: current.phase,
    phase_label: current.label,
  };
}

function daysWithoutIncidents(
  value: StatusDaysWithoutIncidents,
): StatusPublicDaysWithoutIncidentsDto {
  return {
    mode: daysWithoutIncidentsMode(value.mode),
    label: formatStatusDaysWithoutIncidents(value),
    days: value.days,
    last_ended_iso: value.lastEndedIso,
  };
}

function incident(item: StatusIncident): StatusPublicIncidentDto {
  const current = getStatusIncidentPhase(item);
  const links = incidentLinks(item);

  return {
    id: item.id,
    title: item.title,
    service: item.service,
    service_label: formatStatusService(item.service),
    kind: item.kind,
    kind_label: formatStatusKind(item.kind),
    year: item.year,
    month: item.month,
    slug: item.slug,
    html_url: links.html_url,
    markdown_url: links.markdown_url,
    started_at: item.started.iso,
    started_has_time: item.started.hasTime,
    ended_at: item.ended?.iso,
    ended_has_time: item.ended?.hasTime ?? false,
    is_active: current.isActive,
    phase: current.phase,
    phase_label: current.label,
    applies_to_all_areas: item.appliesToAllAreas,
    areas: [...item.areas],
    source_url: item.sourceUrl ? fullUrl(item.sourceUrl) : undefined,
    excerpt: item.excerpt,
    body_markdown: item.body,
    duration: item.duration ? duration(item.duration) : undefined,
  };
}

function summary(item: StatusServiceSummary): StatusPublicServiceSummaryDto {
  const latest = item.incidents[0];

  return {
    service: item.service,
    service_label: formatStatusService(item.service),
    service_status: item.serviceStatus,
    service_status_label: formatStatusServiceState(item.serviceStatus),
    html_url: fullUrl(statusServiceUrl(item.service)),
    markdown_url: fullUrl(statusServiceMarkdownUrl(item.service)),
    incident_ids: item.incidents.map((entry) => entry.id),
    active_incident_ids: item.activeIncidents.map((entry) => entry.id),
    active_maintenance_ids: item.activeMaintenance.map((entry) => entry.id),
    days_without_incidents: daysWithoutIncidents(item.daysWithoutIncidents),
    latest_incident: latest ? incidentRef(latest) : undefined,
  };
}

const latestUpdate = (data: StatusDataset): string | undefined => {
  const item = data.incidents[0];

  if (!item) {
    return undefined;
  }

  return item.ended?.iso ?? item.started.iso;
};

export const buildStatusPublicPayload = (
  data: StatusDataset,
): StatusPublicPayloadDto => {
  const updatedAt = latestUpdate(data);

  return statusPublicPayloadSchema.parse({
    stats: {
      incident_count: data.incidents.length,
      active_count: data.active.length,
      active_incident_count: data.active.filter(
        (item) => item.kind === 'incident',
      ).length,
      active_maintenance_count: data.active.filter(
        (item) => item.kind === 'maintenance',
      ).length,
      service_count: data.services.length,
      updated_at: updatedAt,
    },
    active: data.active.map(incident),
    incidents: data.incidents.map(incident),
    services: data.services.map(summary),
  });
};
