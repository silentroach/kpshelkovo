import type { StatusArea, StatusKind } from './schema';
import type { StatusTimelineIncidentInput } from './timeline';
import type { StatusDuration, StatusIncidentPhase } from './types';

export interface StatusTimelineTooltipItemDto {
  readonly kind: StatusKind;
  readonly title: string;
  readonly phase: StatusIncidentPhase;
  readonly startedIso: string;
  readonly startedHasTime: boolean;
  readonly endedIso?: string;
  readonly endedHasTime: boolean;
  readonly areas?: readonly StatusArea[];
  readonly duration?: StatusDuration;
}

export const toStatusTimelineTooltipItemDto = (
  item: StatusTimelineIncidentInput,
): StatusTimelineTooltipItemDto => ({
  kind: item.kind,
  title: item.title,
  phase: item.phase,
  startedIso: item.startedIso,
  startedHasTime: item.startedHasTime,
  endedIso: item.endedIso,
  endedHasTime: item.endedHasTime,
  areas: item.areas?.length ? item.areas : undefined,
  duration: item.duration,
});
