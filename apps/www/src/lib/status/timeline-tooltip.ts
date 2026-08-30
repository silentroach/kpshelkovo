import type {
  StatusTimelineTooltipItemDto,
  StatusTimelineTooltipListItemData,
} from './timeline-tooltip.types';

const getStatusTimelineTooltipPhaseIcon = (
  item: Pick<StatusTimelineTooltipItemDto, 'kind' | 'phase'>,
): 'alert' | 'check' | undefined => {
  if (item.kind !== 'incident' || item.phase === 'scheduled') {
    return undefined;
  }

  return item.phase === 'active' ? 'alert' : 'check';
};

export const toStatusTimelineTooltipListItemData = (
  item: StatusTimelineTooltipItemDto,
): StatusTimelineTooltipListItemData => ({
  title: item.title,
  periodLabel:
    item.phase === 'active'
      ? (item.activePeriodLabel ?? item.periodLabel)
      : item.periodLabel,
  areas: item.areas,
  areaLabel: item.areaLabel,
  phaseIcon: getStatusTimelineTooltipPhaseIcon(item),
});

export const formatStatusTimelineTooltipGroupLabel = (input: {
  readonly serviceLabel: string;
  readonly title: string;
  readonly items: readonly StatusTimelineTooltipListItemData[];
}): string =>
  [
    input.serviceLabel,
    input.title,
    ...input.items.map((item) =>
      [
        item.title,
        item.periodLabel,
        ...(item.areaLabel ? [`Части поселка: ${item.areaLabel}`] : []),
      ].join('. '),
    ),
  ].join('. ');
