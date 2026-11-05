import type * as z from 'zod/mini';

import type { StatusArea, StatusKind } from './schema';
import type { statusTimelineRecordsSchema } from './timeline.schema';
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

/** Trusted internal SSR data; schema imports are erased from the client. */
export type StatusTimelineRecords = z.infer<typeof statusTimelineRecordsSchema>;
export type StatusTimelineRecord = StatusTimelineRecords[number];

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
