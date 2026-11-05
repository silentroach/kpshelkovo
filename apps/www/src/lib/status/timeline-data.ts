import { statusTimelineStart } from './timeline';
import { toStatusTimelineTooltipItemDto } from './timeline-tooltip-dto';
import type { StatusTimelineIncidentInput, StatusTimelineRecord } from './timeline.types';

export const buildStatusTimelineRecords = (
  incidents: readonly StatusTimelineIncidentInput[],
  nowMs: number,
  days: number
): readonly StatusTimelineRecord[] => {
  const start = statusTimelineStart(nowMs, days).toMillis();
  return incidents
    .filter((item) => !item.endedIso || Date.parse(item.endedIso) > start)
    .map((item) => {
      const labels = toStatusTimelineTooltipItemDto(item);
      return {
        id: item.id,
        href: item.href,
        kind: item.kind,
        title: labels.title,
        phase: item.phase,
        startedIso: item.startedIso,
        startedHasTime: item.startedHasTime,
        endedIso: item.endedIso,
        endedHasTime: item.endedHasTime,
        areas: labels.areas,
        areaLabel: labels.areaLabel,
        periodLabel: labels.periodLabel,
        activePeriodLabel: labels.activePeriodLabel
      };
    });
};
