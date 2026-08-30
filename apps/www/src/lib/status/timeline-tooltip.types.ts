import type { StatusArea, StatusKind } from './schema';
import type { StatusIncidentPhase } from './types';

export interface StatusTimelineTooltipItemDto {
  readonly kind: StatusKind;
  readonly title: string;
  readonly phase: StatusIncidentPhase;
  readonly startedIso: string;
  readonly endedIso?: string;
  readonly areas?: readonly StatusArea[];
  readonly areaLabel?: string;
  readonly periodLabel: string;
  readonly activePeriodLabel?: string;
}

export interface StatusTimelineTooltipListItemData {
  readonly title: string;
  readonly periodLabel: string;
  readonly areas?: readonly StatusArea[];
  readonly areaLabel?: string;
  readonly phaseIcon?: 'alert' | 'check';
}
