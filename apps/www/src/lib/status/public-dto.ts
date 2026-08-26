import { absoluteUrl } from '../site';
import type {
  StatusDataset,
  StatusDaysWithoutIncidents,
  StatusDuration,
  StatusIncident,
  StatusIncidentPhase,
  StatusServiceSummary,
} from './types';
import { statusServiceMarkdownUrl, statusServiceUrl } from './routes';
import {
  formatStatusDuration,
  formatStatusDaysWithoutIncidents,
  formatStatusKind,
  formatStatusService,
  formatStatusServiceState,
  getStatusIncidentPhase,
} from './view';

export type StatusPublicIncidentPhase = StatusIncidentPhase;
export type StatusPublicDaysWithoutIncidentsMode =
  'count' | 'active_incident' | 'no_incidents';

export interface StatusPublicDurationDto {
  readonly total_minutes: number;
  readonly human: string;
}

export interface StatusPublicDaysWithoutIncidentsDto {
  readonly mode: StatusPublicDaysWithoutIncidentsMode;
  readonly label: string;
  readonly days?: number;
  readonly last_ended_iso?: string;
}

interface StatusPublicIncidentLinksDto {
  readonly html_url?: string;
  readonly markdown_url?: string;
}

export interface StatusPublicIncidentRefDto extends StatusPublicIncidentLinksDto {
  readonly id: string;
  readonly title: string;
  readonly phase: StatusPublicIncidentPhase;
  readonly phase_label: string;
}

export interface StatusPublicIncidentDto extends StatusPublicIncidentLinksDto {
  readonly id: string;
  readonly title: string;
  readonly service: StatusIncident['service'];
  readonly service_label: string;
  readonly kind: StatusIncident['kind'];
  readonly kind_label: string;
  readonly year: number;
  readonly month: number;
  readonly slug: string;
  readonly started_at: string;
  readonly started_has_time: boolean;
  readonly ended_at?: string;
  readonly ended_has_time: boolean;
  readonly is_active: boolean;
  readonly phase: StatusPublicIncidentPhase;
  readonly phase_label: string;
  readonly applies_to_all_areas: boolean;
  readonly areas: StatusIncident['areas'];
  readonly source_url?: string;
  readonly excerpt?: string;
  readonly body_markdown: string;
  readonly duration?: StatusPublicDurationDto;
}

export interface StatusPublicServiceSummaryDto {
  readonly service: StatusServiceSummary['service'];
  readonly service_label: string;
  readonly service_status: StatusServiceSummary['serviceStatus'];
  readonly service_status_label: string;
  readonly html_url: string;
  readonly markdown_url: string;
  readonly incident_ids: readonly string[];
  readonly active_incident_ids: readonly string[];
  readonly active_maintenance_ids: readonly string[];
  readonly days_without_incidents: StatusPublicDaysWithoutIncidentsDto;
  readonly latest_incident?: StatusPublicIncidentRefDto;
}

export interface StatusPublicPayloadDto {
  readonly stats: {
    readonly incident_count: number;
    readonly active_count: number;
    readonly active_incident_count: number;
    readonly active_maintenance_count: number;
    readonly service_count: number;
    readonly updated_at?: string;
  };
  readonly active: readonly StatusPublicIncidentDto[];
  readonly incidents: readonly StatusPublicIncidentDto[];
  readonly services: readonly StatusPublicServiceSummaryDto[];
}

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

  return {
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
  };
};
