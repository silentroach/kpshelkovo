const TOOLTIP_ROOT_SELECTOR = '[data-status-calendar-tooltip-root]';
const TOOLTIP_SELECTOR = '[data-status-calendar-tooltip]';
const TODAY_SELECTOR =
  '[data-status-calendar-today], .status-calendar-date--today';
const TOOLTIP_SHIFT_PROPERTY = '--status-calendar-tooltip-shift-x';
const TOOLTIP_VIEWPORT_MARGIN = 16;
const TODAY_REFRESH_INTERVAL = 60_000;
const MOSCOW_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

let installed = false;
let focusedTooltipRoot: HTMLElement | undefined;
let hoveredTooltipRoot: HTMLElement | undefined;

const tooltipRoot = (
  target: EventTarget | undefined,
): HTMLElement | undefined =>
  target instanceof Element
    ? (target.closest(TOOLTIP_ROOT_SELECTOR) as HTMLElement | undefined)
    : undefined;

const movedOutside = (root: HTMLElement, target: EventTarget | undefined) =>
  !(target instanceof Node) || !root.contains(target);

const resetTooltipDismissal = (root: HTMLElement): void => {
  if (focusedTooltipRoot !== root && hoveredTooltipRoot !== root) {
    root.removeAttribute('data-tooltip-dismissed');
  }
};

const tooltipHorizontalShift = (
  bounds: Pick<DOMRect, 'left' | 'right'>,
  viewportWidth: number,
): number => {
  if (bounds.left < TOOLTIP_VIEWPORT_MARGIN) {
    return TOOLTIP_VIEWPORT_MARGIN - bounds.left;
  }

  const maxRight = viewportWidth - TOOLTIP_VIEWPORT_MARGIN;

  return bounds.right > maxRight ? maxRight - bounds.right : 0;
};

const moscowDateId = (now: Date): string => {
  const parts = new Map(
    MOSCOW_DATE_FORMAT.formatToParts(now).map((part) => [
      part.type,
      part.value,
    ]),
  );
  const year = parts.get('year');
  const month = parts.get('month');
  const day = parts.get('day');

  if (!year || !month || !day) {
    throw new Error('Moscow calendar date could not be formatted');
  }

  return `${year}-${month}-${day}`;
};

export const refreshStatusCalendarToday = (now = new Date()): void => {
  document.querySelectorAll<HTMLElement>(TODAY_SELECTOR).forEach((element) => {
    element.classList.remove('status-calendar-date--today');
    element.removeAttribute('data-status-calendar-today');
    element.querySelector('a, time')?.removeAttribute('aria-current');
  });

  const todayId = moscowDateId(now);
  const today = document.querySelector<HTMLElement>(
    `[data-status-calendar-date="${todayId}"]`,
  );

  if (!today) {
    return;
  }

  today.classList.add('status-calendar-date--today');
  today.dataset.statusCalendarToday = todayId;
  today.querySelector('a, time')?.setAttribute('aria-current', 'date');
};

export const positionStatusCalendarTooltip = (
  root: HTMLElement,
  viewportWidth = window.innerWidth,
): void => {
  const tooltip = root.querySelector<HTMLElement>(TOOLTIP_SELECTOR);

  if (!tooltip) {
    return;
  }

  tooltip.style.removeProperty(TOOLTIP_SHIFT_PROPERTY);

  const bounds = tooltip.getBoundingClientRect();
  const shift = tooltipHorizontalShift(bounds, viewportWidth);

  tooltip.style.setProperty(TOOLTIP_SHIFT_PROPERTY, `${shift}px`);
};

export const installStatusCalendarYearInteractions = (): void => {
  refreshStatusCalendarToday();

  if (installed) {
    return;
  }

  installed = true;
  document.addEventListener('astro:page-load', () => {
    focusedTooltipRoot = undefined;
    hoveredTooltipRoot = undefined;
    refreshStatusCalendarToday();
  });
  window.setInterval(refreshStatusCalendarToday, TODAY_REFRESH_INTERVAL);
  document.addEventListener('focusin', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root) {
      focusedTooltipRoot = root;
      positionStatusCalendarTooltip(root);
    }
  });
  document.addEventListener('pointerover', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root) {
      hoveredTooltipRoot = root;
      positionStatusCalendarTooltip(root);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape') {
      return;
    }

    tooltipRoot(event.target || undefined)?.setAttribute(
      'data-tooltip-dismissed',
      '',
    );
    focusedTooltipRoot?.setAttribute('data-tooltip-dismissed', '');
    hoveredTooltipRoot?.setAttribute('data-tooltip-dismissed', '');
  });
  document.addEventListener('focusout', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root && movedOutside(root, event.relatedTarget || undefined)) {
      if (focusedTooltipRoot === root) {
        focusedTooltipRoot = undefined;
      }

      resetTooltipDismissal(root);
    }
  });
  document.addEventListener('pointerout', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root && movedOutside(root, event.relatedTarget || undefined)) {
      if (hoveredTooltipRoot === root) {
        hoveredTooltipRoot = undefined;
      }

      resetTooltipDismissal(root);
    }
  });
};
