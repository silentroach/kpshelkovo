import {
  buildStatusTimelineLaneLayout,
  buildStatusTimelineStableSegments,
  clipStatusTimelineSpan,
  getStatusTimelineHitInterval,
  getStatusTimelineSegmentGeometry,
  getStatusTimelineRange,
  STATUS_TIMELINE_MIN_TRACK_WIDTH_PX,
  type StatusTimelineSpan,
} from './timeline';
import {
  buildStatusTimelineTooltipListItemData,
  formatStatusTimelineTooltipGroupLabel,
  getStatusIncidentPhase,
  type StatusTimelineTooltipListItemData,
} from './view';
import { STATUS_SERVICES, type StatusArea, type StatusService } from './schema';
import type { StatusTimelineTooltipItemDto } from './timeline-tooltip-dto';

export interface StatusTimelineHydrationOptions {
  readonly nowMs?: number;
}

interface StatusTimelineProblemNode {
  readonly element: HTMLElement;
  readonly kind?: 'incident' | 'maintenance';
  readonly service?: StatusService;
  readonly startIso: string;
  readonly endIso?: string;
  readonly startMs: number;
  readonly endMs?: number;
  readonly geometryStartMs?: number;
  readonly geometryEndMs?: number;
}

interface StatusTimelineTooltipData {
  readonly title: string;
  readonly ariaLabel: string;
  readonly phaseIcon?: 'alert' | 'check';
  readonly periodLabel?: string;
  readonly areaLabel?: string;
  readonly areas?: readonly StatusArea[];
  readonly items?: readonly StatusTimelineTooltipListItemData[];
}

interface StatusTimelineTooltipElements {
  readonly shell: HTMLElement;
  readonly titleRow: HTMLElement;
  readonly title: HTMLElement;
  readonly phaseAlertIcon: HTMLElement;
  readonly phaseCheckIcon: HTMLElement;
  readonly period: HTMLElement;
  readonly titleAreas: HTMLElement;
  readonly areaTemplates: ReadonlyMap<StatusArea, HTMLElement>;
  readonly list: HTMLElement;
}

declare global {
  interface Window {
    __STATUS_TIMELINE_NOW__?: unknown;
  }
}

const STATUS_TIMELINE_SELECTOR = '[data-status-timeline]';
const STATUS_TIMELINE_TRACK_SELECTOR = '[data-status-timeline-track]';
const STATUS_TIMELINE_PROBLEM_SELECTOR = '[data-status-problem]';
const STATUS_TIMELINE_GREEN_SELECTOR = '[data-status-segment="green"]';
const STATUS_TIMELINE_TOOLTIP_SELECTOR = '[data-status-timeline-tooltip]';
const STATUS_TIMELINE_TOOLTIP_MARGIN_PX = 8;
const STATUS_TIMELINE_COMPACT_MARKER_CLASS =
  'status-service-timeline__segment--compact-marker';
const STATUS_TIMELINE_ACTIVE_END_CLASS =
  'status-service-timeline__segment--problem-active-end';
const STATUS_TIMELINE_AREAS = [
  'river',
  'forest',
  'park',
  'village',
] as const satisfies readonly StatusArea[];
const STATUS_TIMELINE_AREA_SET = new Set<string>(STATUS_TIMELINE_AREAS);
const STATUS_TIMELINE_SERVICE_SET = new Set<string>(STATUS_SERVICES);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hideStatusTimelineSegment = (element: HTMLElement): void => {
  element.hidden = true;
};

const showStatusTimelineSegment = (
  element: HTMLElement,
  geometry: { readonly leftPercent: number; readonly widthPercent: number },
): void => {
  element.style.setProperty('--segment-left', String(geometry.leftPercent));
  element.style.setProperty('--segment-width', String(geometry.widthPercent));
  element.hidden = false;
};

const statusTimelineLaneObservers = new WeakMap<HTMLElement, ResizeObserver>();

const layoutStatusTimelineProblemLanes = (
  root: HTMLElement,
  track: HTMLElement,
): void => {
  const trackWidthPx = track.getBoundingClientRect().width;
  const layoutWidthPx =
    trackWidthPx > 0 ? trackWidthPx : STATUS_TIMELINE_MIN_TRACK_WIDTH_PX;
  const problemNodes = Array.from(
    track.querySelectorAll(STATUS_TIMELINE_PROBLEM_SELECTOR),
  ).filter((node): node is HTMLElement => node instanceof HTMLElement);
  const intervals = problemNodes.flatMap((element) => {
    element.style.removeProperty('--segment-lane-offset');

    if (element.hidden) {
      return [];
    }

    const id = element.dataset.incidentId;
    const leftValue = element.style.getPropertyValue('--segment-left');
    const widthValue = element.style.getPropertyValue('--segment-width');

    if (!id || !leftValue || !widthValue) {
      return [];
    }

    const leftPercent = Number(leftValue);
    const widthPercent = Number(widthValue);

    if (!Number.isFinite(leftPercent) || !Number.isFinite(widthPercent)) {
      return [];
    }

    return [
      getStatusTimelineHitInterval(
        {
          id,
          leftPercent,
          widthPercent,
          compactMarker: element.classList.contains(
            STATUS_TIMELINE_COMPACT_MARKER_CLASS,
          ),
          reachesRangeEnd: element.classList.contains(
            STATUS_TIMELINE_ACTIVE_END_CLASS,
          ),
        },
        layoutWidthPx,
      ),
    ];
  });
  const layout = buildStatusTimelineLaneLayout(intervals);

  problemNodes.forEach((element) => {
    const id = element.dataset.incidentId;
    const offsetPx = id ? layout.offsetsById.get(id) : undefined;

    if (offsetPx !== undefined) {
      element.style.setProperty('--segment-lane-offset', `${offsetPx}px`);
    }
  });
  root.style.setProperty('--timeline-lane-space', `${layout.spacePx}px`);
};

const observeStatusTimelineLaneLayout = (
  root: HTMLElement,
  track: HTMLElement,
): void => {
  if (
    statusTimelineLaneObservers.has(root) ||
    typeof ResizeObserver === 'undefined'
  ) {
    return;
  }

  const observer = new ResizeObserver(() => {
    layoutStatusTimelineProblemLanes(root, track);
  });

  observer.observe(track);
  statusTimelineLaneObservers.set(root, observer);
};

const getStatusTimelineTooltip = (
  root: HTMLElement,
): StatusTimelineTooltipElements | undefined => {
  const shell = root.querySelector(STATUS_TIMELINE_TOOLTIP_SELECTOR);

  if (!(shell instanceof HTMLElement)) {
    return undefined;
  }

  const title = shell.querySelector('[data-status-tooltip-title]');
  const phaseAlertIcon = shell.querySelector(
    '[data-status-tooltip-phase-icon-alert]',
  );
  const phaseCheckIcon = shell.querySelector(
    '[data-status-tooltip-phase-icon-check]',
  );
  const period = shell.querySelector('[data-status-tooltip-period]');
  const titleAreas = shell.querySelector('[data-status-tooltip-title-areas]');
  const list = shell.querySelector('[data-status-tooltip-list]');
  const titleRow = title?.parentElement;
  const areaTemplates = new Map(
    STATUS_TIMELINE_AREAS.flatMap((area) => {
      const template = shell.querySelector(
        `[data-status-tooltip-area-template="${area}"]`,
      );

      return template instanceof HTMLElement ? [[area, template]] : [];
    }),
  );

  if (
    !(titleRow instanceof HTMLElement) ||
    !(title instanceof HTMLElement) ||
    !(phaseAlertIcon instanceof HTMLElement) ||
    !(phaseCheckIcon instanceof HTMLElement) ||
    !(period instanceof HTMLElement) ||
    !(titleAreas instanceof HTMLElement) ||
    areaTemplates.size !== STATUS_TIMELINE_AREAS.length ||
    !(list instanceof HTMLElement)
  ) {
    return undefined;
  }

  return {
    shell,
    titleRow,
    title,
    phaseAlertIcon,
    phaseCheckIcon,
    period,
    titleAreas,
    areaTemplates,
    list,
  };
};

const isStatusTimelineArea = (value: unknown): value is StatusArea =>
  typeof value === 'string' && STATUS_TIMELINE_AREA_SET.has(value);

const isStatusTimelineService = (value: unknown): value is StatusService =>
  typeof value === 'string' && STATUS_TIMELINE_SERVICE_SET.has(value);

const parseStatusTimelineTooltipAreas = (
  value?: string,
): readonly StatusArea[] | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }

    return parsed.every(isStatusTimelineArea) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const isTimelineTooltipSerializedItem = (
  value: unknown,
): value is StatusTimelineTooltipItemDto => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StatusTimelineTooltipItemDto>;

  return (
    (candidate.kind === 'incident' || candidate.kind === 'maintenance') &&
    typeof candidate.title === 'string' &&
    typeof candidate.isActive === 'boolean' &&
    typeof candidate.startedIso === 'string' &&
    Number.isFinite(Date.parse(candidate.startedIso)) &&
    typeof candidate.startedHasTime === 'boolean' &&
    typeof candidate.endedHasTime === 'boolean' &&
    (candidate.endedIso === undefined ||
      (typeof candidate.endedIso === 'string' &&
        Number.isFinite(Date.parse(candidate.endedIso)))) &&
    (candidate.duration === undefined ||
      (Boolean(candidate.duration) &&
        typeof candidate.duration === 'object' &&
        typeof candidate.duration.totalMinutes === 'number' &&
        Number.isFinite(candidate.duration.totalMinutes))) &&
    (candidate.areas === undefined ||
      (Array.isArray(candidate.areas) &&
        candidate.areas.length > 0 &&
        candidate.areas.every(isStatusTimelineArea)))
  );
};

const parseStatusTimelineTooltipItems = (
  value?: string,
): readonly StatusTimelineTooltipItemDto[] | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }

    return parsed.every(isTimelineTooltipSerializedItem) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const toStatusTimelineTooltipListItemData = (
  item: StatusTimelineTooltipItemDto,
): StatusTimelineTooltipListItemData =>
  buildStatusTimelineTooltipListItemData(item, { nonBreaking: true });

const readStatusTimelineTooltipData = (
  trigger: HTMLElement,
): StatusTimelineTooltipData | undefined => {
  const serviceLabel = trigger.dataset.tooltipServiceLabel;
  const groupTitle = trigger.dataset.tooltipGroupTitle;
  const tooltipItems = parseStatusTimelineTooltipItems(
    trigger.dataset.tooltipItems,
  );

  if (serviceLabel && groupTitle && tooltipItems) {
    const items = tooltipItems.map(toStatusTimelineTooltipListItemData);

    return {
      title: groupTitle,
      ariaLabel: formatStatusTimelineTooltipGroupLabel({
        serviceLabel,
        title: groupTitle,
        items,
      }),
      items,
    };
  }

  const title = trigger.dataset.tooltipTitle;
  const phaseIcon = trigger.dataset.tooltipPhaseIcon;
  const periodLabel = trigger.dataset.tooltipPeriodLabel;
  const areaLabel = trigger.dataset.tooltipAreaLabel;
  const areas = parseStatusTimelineTooltipAreas(trigger.dataset.tooltipAreas);
  const kindLabel = trigger.dataset.tooltipKindLabel;
  const phaseLabel = trigger.dataset.tooltipPhaseLabel;

  if (!serviceLabel || !kindLabel || !title || !phaseLabel || !periodLabel) {
    return undefined;
  }

  return {
    title,
    ariaLabel: [
      serviceLabel,
      kindLabel,
      title,
      `Статус: ${phaseLabel}`,
      periodLabel,
      ...(areaLabel ? [`Части поселка: ${areaLabel}`] : []),
    ].join('. '),
    phaseIcon:
      phaseIcon === 'alert' || phaseIcon === 'check' ? phaseIcon : undefined,
    periodLabel,
    areaLabel,
    areas,
  };
};

const renderStatusTimelineTooltipAreas = (
  target: HTMLElement,
  templates: ReadonlyMap<StatusArea, HTMLElement>,
  areas?: readonly StatusArea[],
): void => {
  target.replaceChildren();

  if (!areas?.length) {
    target.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  areas.forEach((area) => {
    const template = templates.get(area);
    const icon = template?.firstElementChild?.cloneNode(true);

    if (icon instanceof HTMLElement) {
      fragment.append(icon);
    }
  });

  target.append(fragment);
  target.hidden = target.childElementCount === 0;
};

const setStatusTimelineProblemAriaLabel = (element: HTMLElement): void => {
  const tooltip = readStatusTimelineTooltipData(element);

  if (!tooltip) {
    return;
  }

  element.setAttribute('aria-label', tooltip.ariaLabel);
};

const renderStatusTimelineTooltipItems = (
  tooltip: StatusTimelineTooltipElements,
  items?: readonly StatusTimelineTooltipListItemData[],
): void => {
  tooltip.list.replaceChildren();

  if (!items?.length) {
    tooltip.list.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const shell = document.createElement('div');
    const title = tooltip.titleRow.cloneNode(true) as HTMLElement;
    const titleText = title.querySelector('[data-status-tooltip-title]');
    const phaseAlertIcon = title.querySelector(
      '[data-status-tooltip-phase-icon-alert]',
    );
    const phaseCheckIcon = title.querySelector(
      '[data-status-tooltip-phase-icon-check]',
    );
    const period = tooltip.period.cloneNode(true) as HTMLElement;
    const titleAreas = title.querySelector('[data-status-tooltip-title-areas]');

    shell.style.display = 'grid';
    shell.style.gap = '0.4rem';

    if (index > 0) {
      shell.style.paddingTop = '0.7rem';
      shell.style.borderTop =
        '1px solid color-mix(in oklab, var(--color-border) 76%, var(--color-surface-raised) 24%)';
    }

    title.hidden = false;
    period.hidden = false;

    if (titleText instanceof HTMLElement) {
      titleText.hidden = false;
      titleText.textContent = item.title;
      titleText.removeAttribute('data-status-tooltip-title');
    }

    if (titleAreas instanceof HTMLElement) {
      titleAreas.removeAttribute('data-status-tooltip-title-areas');
      renderStatusTimelineTooltipAreas(
        titleAreas,
        tooltip.areaTemplates,
        item.areas,
      );
    }

    if (phaseAlertIcon instanceof HTMLElement) {
      phaseAlertIcon.hidden = item.phaseIcon !== 'alert';
      phaseAlertIcon.removeAttribute('data-status-tooltip-phase-icon-alert');
    }

    if (phaseCheckIcon instanceof HTMLElement) {
      phaseCheckIcon.hidden = item.phaseIcon !== 'check';
      phaseCheckIcon.removeAttribute('data-status-tooltip-phase-icon-check');
    }

    period.textContent = item.periodLabel;
    period.removeAttribute('data-status-tooltip-period');
    shell.append(title, period);
    fragment.append(shell);
  });

  tooltip.list.append(fragment);
  tooltip.list.hidden = false;
};

const syncStatusTimelineProblemPhase = (
  problemNode: StatusTimelineProblemNode,
  nowMs: number,
): void => {
  if (problemNode.kind !== 'incident' && problemNode.kind !== 'maintenance') {
    return;
  }

  if (problemNode.startMs > nowMs) {
    problemNode.element.dataset.tooltipPhaseLabel =
      problemNode.kind === 'maintenance' ? 'запланировано' : 'ожидается';
    delete problemNode.element.dataset.tooltipPhaseIcon;
    setStatusTimelineProblemAriaLabel(problemNode.element);
    return;
  }

  if (problemNode.endMs === undefined || problemNode.endMs > nowMs) {
    problemNode.element.dataset.tooltipPhaseLabel = 'идет';

    if (problemNode.kind === 'incident') {
      problemNode.element.dataset.tooltipPhaseIcon = 'alert';
    } else {
      delete problemNode.element.dataset.tooltipPhaseIcon;
    }

    setStatusTimelineProblemAriaLabel(problemNode.element);
    return;
  }

  if (!problemNode.endIso) {
    return;
  }

  problemNode.element.dataset.tooltipPhaseLabel = getStatusIncidentPhase(
    {
      kind: problemNode.kind,
      isActive: false,
      started: {
        iso: problemNode.startIso,
        hasTime: true,
      },
      ended: {
        iso: problemNode.endIso,
        hasTime: true,
      },
      service: problemNode.service,
    },
    { nowMs },
  ).label;

  if (problemNode.kind === 'incident') {
    problemNode.element.dataset.tooltipPhaseIcon = 'check';
  } else {
    delete problemNode.element.dataset.tooltipPhaseIcon;
  }

  setStatusTimelineProblemAriaLabel(problemNode.element);
};

const closeStatusTimelineTooltip = (
  root: HTMLElement,
  tooltip: StatusTimelineTooltipElements,
): void => {
  root.querySelectorAll('[aria-describedby]').forEach((node) => {
    if (
      node instanceof HTMLElement &&
      node.getAttribute('aria-describedby') === tooltip.shell.id
    ) {
      node.removeAttribute('aria-describedby');
    }
  });

  tooltip.shell.hidden = true;
  tooltip.shell.setAttribute('aria-hidden', 'true');
  delete root.dataset.statusTooltipOpen;
};

const positionStatusTimelineTooltip = (
  root: HTMLElement,
  trigger: HTMLElement,
  tooltip: HTMLElement,
): void => {
  const rootRect = root.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipHeight = tooltip.offsetHeight;
  const center = triggerRect.left - rootRect.left + triggerRect.width / 2;
  const minLeft = tooltip.offsetWidth / 2 + STATUS_TIMELINE_TOOLTIP_MARGIN_PX;
  const maxLeft = Math.max(
    minLeft,
    rootRect.width -
      tooltip.offsetWidth / 2 -
      STATUS_TIMELINE_TOOLTIP_MARGIN_PX,
  );
  const left = Math.min(Math.max(center, minLeft), maxLeft);
  const spaceBelow = window.innerHeight - rootRect.bottom;
  const spaceAbove = rootRect.top;
  const side =
    spaceBelow >= tooltipHeight + STATUS_TIMELINE_TOOLTIP_MARGIN_PX ||
    spaceBelow >= spaceAbove
      ? 'below'
      : 'above';

  tooltip.dataset.side = side;
  tooltip.style.left = `${left}px`;
};

const openStatusTimelineTooltip = (
  root: HTMLElement,
  trigger: HTMLElement,
  tooltip: StatusTimelineTooltipElements,
): void => {
  const data = readStatusTimelineTooltipData(trigger);

  if (!data || !tooltip.shell.id) {
    closeStatusTimelineTooltip(root, tooltip);
    return;
  }

  root.querySelectorAll('[aria-describedby]').forEach((node) => {
    if (node instanceof HTMLElement && node !== trigger) {
      node.removeAttribute('aria-describedby');
    }
  });

  tooltip.title.textContent = data.title;
  tooltip.titleRow.hidden = !!data.items?.length;
  tooltip.title.hidden = !!data.items?.length;
  tooltip.phaseAlertIcon.hidden =
    data.phaseIcon !== 'alert' || !!data.items?.length;
  tooltip.phaseCheckIcon.hidden =
    data.phaseIcon !== 'check' || !!data.items?.length;
  tooltip.period.hidden = !data.periodLabel;
  tooltip.period.textContent = data.periodLabel ?? '';
  renderStatusTimelineTooltipAreas(
    tooltip.titleAreas,
    tooltip.areaTemplates,
    data.items?.length ? undefined : data.areas,
  );
  renderStatusTimelineTooltipItems(tooltip, data.items);
  tooltip.shell.hidden = false;
  tooltip.shell.setAttribute('aria-hidden', 'false');
  root.dataset.statusTooltipOpen = 'true';
  positionStatusTimelineTooltip(root, trigger, tooltip.shell);
  trigger.setAttribute('aria-describedby', tooltip.shell.id);
};

const bindStatusTimelineTooltipTrigger = (
  root: HTMLElement,
  trigger: HTMLElement,
  tooltip: StatusTimelineTooltipElements,
): void => {
  if (trigger.dataset.statusTooltipBound === 'true') {
    trigger.removeAttribute('title');
    return;
  }

  trigger.dataset.statusTooltipBound = 'true';
  trigger.removeAttribute('title');
  trigger.addEventListener('mouseenter', () => {
    openStatusTimelineTooltip(root, trigger, tooltip);
  });
  trigger.addEventListener('focusin', () => {
    openStatusTimelineTooltip(root, trigger, tooltip);
  });
  trigger.addEventListener(
    'touchstart',
    () => {
      openStatusTimelineTooltip(root, trigger, tooltip);
    },
    { passive: true },
  );
  trigger.addEventListener('mouseleave', () => {
    closeStatusTimelineTooltip(root, tooltip);
  });
  trigger.addEventListener('focusout', (event) => {
    if (
      event.relatedTarget instanceof Node &&
      trigger.contains(event.relatedTarget)
    ) {
      return;
    }

    closeStatusTimelineTooltip(root, tooltip);
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeStatusTimelineTooltip(root, tooltip);
    }
  });
};

const parseStatusTimelineProblemNode = (
  element: HTMLElement,
): StatusTimelineProblemNode | undefined => {
  const startIso = element.dataset.start ?? '';
  const startMs = Date.parse(startIso);
  const geometryStartMs = Date.parse(element.dataset.geometryStart ?? '');
  const geometryEndMs = Date.parse(element.dataset.geometryEnd ?? '');
  const service = element.dataset.statusService;

  if (!Number.isFinite(startMs)) {
    return undefined;
  }

  const rawEnd = element.dataset.end;

  if (!rawEnd) {
    return {
      element,
      kind:
        element.dataset.statusKind === 'incident' ||
        element.dataset.statusKind === 'maintenance'
          ? element.dataset.statusKind
          : undefined,
      service: isStatusTimelineService(service) ? service : undefined,
      startIso,
      startMs,
      geometryStartMs: Number.isFinite(geometryStartMs)
        ? geometryStartMs
        : undefined,
      geometryEndMs: Number.isFinite(geometryEndMs) ? geometryEndMs : undefined,
    };
  }

  const endMs = Date.parse(rawEnd);

  if (!Number.isFinite(endMs)) {
    return undefined;
  }

  return {
    element,
    kind:
      element.dataset.statusKind === 'incident' ||
      element.dataset.statusKind === 'maintenance'
        ? element.dataset.statusKind
        : undefined,
    service: isStatusTimelineService(service) ? service : undefined,
    startIso,
    endIso: rawEnd,
    startMs,
    endMs,
    geometryStartMs: Number.isFinite(geometryStartMs)
      ? geometryStartMs
      : undefined,
    geometryEndMs: Number.isFinite(geometryEndMs) ? geometryEndMs : undefined,
  };
};

const appendStatusTimelineGreenSegment = (
  track: HTMLElement,
  segment: { readonly leftPercent: number; readonly widthPercent: number },
): void => {
  const element = document.createElement('span');

  element.dataset.statusSegment = 'green';
  element.className =
    'status-service-timeline__segment status-service-timeline__segment--green';
  element.title = 'Без инцидентов';
  element.setAttribute('aria-hidden', 'true');
  showStatusTimelineSegment(element, segment);
  track.append(element);
};

const getStatusTimelineNowMs = (
  opts?: StatusTimelineHydrationOptions,
): number => {
  if (isFiniteNumber(opts?.nowMs)) {
    return opts.nowMs;
  }

  // Test/fixture override keeps DOM hydration deterministic.
  if (
    typeof window !== 'undefined' &&
    isFiniteNumber(window.__STATUS_TIMELINE_NOW__)
  ) {
    return window.__STATUS_TIMELINE_NOW__;
  }

  return Date.now();
};

export const hydrateStatusTimeline = (
  root: HTMLElement,
  opts?: StatusTimelineHydrationOptions,
): void => {
  const rangeDays = Number(root.dataset.rangeDays ?? '');

  if (!Number.isFinite(rangeDays) || rangeDays <= 0) {
    return;
  }

  const track = root.querySelector(STATUS_TIMELINE_TRACK_SELECTOR);

  if (!(track instanceof HTMLElement)) {
    return;
  }

  const tooltip = getStatusTimelineTooltip(root);

  if (tooltip) {
    closeStatusTimelineTooltip(root, tooltip);
  }

  track
    .querySelectorAll(STATUS_TIMELINE_GREEN_SELECTOR)
    .forEach((node) => node.remove());

  const range = getStatusTimelineRange(getStatusTimelineNowMs(opts), rangeDays);

  if (range.spanMs <= 0) {
    return;
  }

  const problemSpans: StatusTimelineSpan[] = [];

  track.querySelectorAll(STATUS_TIMELINE_PROBLEM_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (tooltip) {
      bindStatusTimelineTooltipTrigger(root, node, tooltip);
    }

    hideStatusTimelineSegment(node);

    const problemNode = parseStatusTimelineProblemNode(node);

    if (!problemNode) {
      return;
    }

    syncStatusTimelineProblemPhase(problemNode, range.endMs);
    setStatusTimelineProblemAriaLabel(problemNode.element);

    const span = clipStatusTimelineSpan(
      {
        startMs: problemNode.geometryStartMs ?? problemNode.startMs,
        ...(problemNode.geometryEndMs !== undefined
          ? { endMs: problemNode.geometryEndMs }
          : problemNode.endMs !== undefined
            ? { endMs: problemNode.endMs }
            : {}),
      },
      range,
    );

    if (!span) {
      return;
    }

    showStatusTimelineSegment(
      problemNode.element,
      getStatusTimelineSegmentGeometry(span, range),
    );
    problemSpans.push(span);
  });

  layoutStatusTimelineProblemLanes(root, track);
  observeStatusTimelineLaneLayout(root, track);

  buildStatusTimelineStableSegments(problemSpans, range).forEach((segment) => {
    appendStatusTimelineGreenSegment(track, segment);
  });
};

export const hydrateStatusTimelines = (
  scope?: ParentNode,
  opts?: StatusTimelineHydrationOptions,
): void => {
  const rootScope =
    scope ?? (typeof document === 'undefined' ? undefined : document);

  if (!rootScope) {
    return;
  }

  const nowMs = getStatusTimelineNowMs(opts);

  rootScope.querySelectorAll(STATUS_TIMELINE_SELECTOR).forEach((root) => {
    if (root instanceof HTMLElement) {
      hydrateStatusTimeline(root, { nowMs });
    }
  });
};
