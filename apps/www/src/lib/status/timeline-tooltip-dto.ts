import type { StatusTimelineIncidentInput } from './timeline';
import type { StatusIncidentPhase } from './types';
import { buildStatusTimelineTooltipListItemData } from './view';
import type { StatusTimelineTooltipItemDto } from './timeline-tooltip.types';

const buildTooltipListItemForPhase = (
  item: StatusTimelineIncidentInput,
  phase: StatusIncidentPhase,
) =>
  buildStatusTimelineTooltipListItemData(
    {
      kind: item.kind,
      title: item.title,
      phase,
      startedIso: item.startedIso,
      startedHasTime: item.startedHasTime,
      endedIso: item.endedIso,
      endedHasTime: item.endedHasTime,
      duration: item.duration,
      areas: item.areas,
    },
    { nonBreaking: true },
  );

export const toStatusTimelineTooltipItemDto = (
  item: StatusTimelineIncidentInput,
): StatusTimelineTooltipItemDto => {
  const scheduled = buildTooltipListItemForPhase(item, 'scheduled');
  const active = buildTooltipListItemForPhase(item, 'active');

  return {
    kind: item.kind,
    title: scheduled.title,
    phase: item.phase,
    startedIso: item.startedIso,
    endedIso: item.endedIso,
    areas: scheduled.areas,
    areaLabel: scheduled.areaLabel,
    periodLabel: scheduled.periodLabel,
    activePeriodLabel:
      active.periodLabel === scheduled.periodLabel
        ? undefined
        : active.periodLabel,
  };
};
