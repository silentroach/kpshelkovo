import type { PreprocessedSiteMarkdownBody } from '../markdown/render';
import type { EntityMentionTarget } from '../mentions';
import type { StatusCalendarProjection } from './calendar.types';
import type {
  StatusArea,
  StatusKind,
  StatusService,
  StatusServiceState,
} from './schema';

export interface StatusDuration {
  readonly totalMinutes: number;
}

export interface StatusIncidentMoment {
  readonly at: Date;
  readonly iso: string;
  readonly hasTime: boolean;
}

export type StatusIncidentPhase = 'active' | 'resolved' | 'scheduled';

export interface StatusIncidentState {
  readonly phase: StatusIncidentPhase;
  readonly label: string;
  readonly tone: 'danger' | 'warning' | 'success' | 'muted' | 'info';
  readonly isActive: boolean;
}

export interface StatusIncidentPhaseInput {
  readonly kind: StatusKind;
  readonly service?: StatusService;
  readonly phase: StatusIncidentPhase;
}

export interface StatusIncidentWindowInput {
  readonly kind: StatusKind;
  readonly service?: StatusService;
  readonly startedAt: number;
  readonly endedAt?: number;
}

interface StatusIncidentBase {
  readonly id: string;
  readonly title: string;
  readonly seo?: {
    readonly description?: string;
  };
  readonly service: StatusService;
  readonly kind: StatusKind;
  readonly year: number;
  readonly month: number;
  readonly slug: string;
  readonly started: StatusIncidentMoment;
  readonly ended?: StatusIncidentMoment;
  readonly phase: StatusIncidentPhase;
  readonly appliesToAllAreas: boolean;
  readonly areas: readonly StatusArea[];
  readonly sourceUrl?: string;
  readonly excerpt?: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  readonly sortStartedAt: number;
  readonly sortLastChangeAt: number;
  readonly duration?: StatusDuration;
}

export interface StatusIncidentWithDetail extends StatusIncidentBase {
  readonly hasPage: true;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export interface StatusIncidentListOnly extends StatusIncidentBase {
  readonly hasPage: false;
  readonly url?: undefined;
  readonly markdownUrl?: undefined;
  readonly canonical?: undefined;
}

export type StatusIncident = StatusIncidentWithDetail | StatusIncidentListOnly;

export interface StatusDaysWithoutIncidents {
  readonly mode: 'count' | 'activeIncident' | 'noIncidents';
  readonly days?: number;
  readonly lastEndedIso?: string;
}

export interface StatusServiceSummary {
  readonly service: StatusService;
  readonly serviceStatus: StatusServiceState;
  readonly incidents: readonly StatusIncident[];
  readonly activeIncidents: readonly StatusIncident[];
  readonly activeMaintenance: readonly StatusIncident[];
  readonly daysWithoutIncidents: StatusDaysWithoutIncidents;
}

export interface StatusDataset {
  readonly incidents: readonly StatusIncident[];
  readonly active: readonly StatusIncident[];
  readonly services: readonly StatusServiceSummary[];
  readonly calendar: StatusCalendarProjection;
  readonly byId: ReadonlyMap<string, StatusIncident>;
  readonly byService: ReadonlyMap<StatusService, StatusServiceSummary>;
}
