import { dateTimeFromISO } from '@shelkovo/format';
import { formatText } from '@shelkovo/typography';

import { toStatusTimelineTooltipItemDto } from './timeline-tooltip-dto';
import type { StatusTimelineIncidentInput, StatusTimelineRecord } from './timeline.types';
import { formatStatusDuration } from './view';

export const buildStatusTimelineRecords = (
  incidents: readonly StatusTimelineIncidentInput[],
  nowMs: number,
  days: number
): readonly StatusTimelineRecord[] => {
  const start = dateTimeFromISO(new Date(nowMs).toISOString())
    .startOf('day')
    .minus({ days: days - 1 })
    .toMillis();
  return incidents
    .filter((item) => !item.endedIso || Date.parse(item.endedIso) > start)
    .map((item) => {
      const labels = toStatusTimelineTooltipItemDto(item);
      const started = dateTimeFromISO(item.startedIso);
      const ended = item.endedIso ? dateTimeFromISO(item.endedIso) : undefined;
      const singleDay = !ended || started.hasSame(ended, 'day');
      const startTime = item.startedHasTime ? started.toFormat('HH:mm') : '';
      const endTime = ended && item.endedHasTime ? ended.toFormat('HH:mm') : '';
      const times =
        startTime && endTime
          ? `${startTime} - ${endTime}`
          : startTime
            ? `С ${startTime}`
            : endTime
              ? `До ${endTime}`
              : '';
      const duration =
        ended && item.duration
          ? `(${formatStatusDuration(item.duration, { nonBreaking: true })})`
          : '';
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
        activePeriodLabel: labels.activePeriodLabel,
        singleDayDate: singleDay ? started.toISODate()! : undefined,
        singleDayPeriodLabel: singleDay
          ? formatText([times, duration].filter(Boolean).join(' '))
          : undefined
      };
    });
};
