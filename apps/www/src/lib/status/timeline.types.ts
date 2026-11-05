import type { StatusArea, StatusKind } from './schema';
import type { StatusTimelineTooltipItemDto } from './timeline-tooltip.types';
import type { StatusDuration, StatusIncidentPhase } from './types';

export interface StatusTimelineIncidentInput {
  readonly id: string;
  readonly href?: string;
  readonly title: string;
  readonly kind: StatusKind;
  readonly startedIso: string;
  readonly startedHasTime: boolean;
  readonly endedIso?: string;
  readonly endedHasTime: boolean;
  readonly phase: StatusIncidentPhase;
  readonly areas?: readonly StatusArea[];
  readonly duration?: StatusDuration;
}

/** Internal component data, not a public status DTO. */
export interface StatusTimelineRecord extends StatusTimelineTooltipItemDto {
  readonly id: string;
  readonly href?: string;
  readonly startedHasTime: boolean;
  readonly endedHasTime: boolean;
}

export interface StatusTimelineDay {
  readonly id: string;
  readonly tone: 'green' | 'amber' | 'red';
  readonly recordIds: readonly string[];
}

export interface StatusTimelineSnapshot {
  readonly nowMs: number;
  readonly days: readonly StatusTimelineDay[];
  readonly records: readonly StatusTimelineRecord[];
}

export interface StatusTimelineBalloonInput {
  readonly root: HTMLElement;
  readonly control: HTMLInputElement;
  readonly snapshot: StatusTimelineSnapshot;
  readonly index: number;
}

export interface StatusTimelineBalloonModule {
  readonly openStatusTimelineDay: (input: StatusTimelineBalloonInput) => void;
  readonly closeStatusTimelineDay: () => void;
}

export type StatusTimelineBalloonLoader = () => Promise<StatusTimelineBalloonModule>;
