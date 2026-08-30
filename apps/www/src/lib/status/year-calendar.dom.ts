const TOOLTIP_ROOT_SELECTOR = '[data-status-calendar-tooltip-root]';
const YEAR_CALENDAR_SELECTOR = '[data-status-calendar-year]';
const YEAR_CALENDAR_LIFECYCLE_ELEMENT = 'status-year-calendar-lifecycle';
const TOOLTIP_SELECTOR = '[data-status-calendar-tooltip]';
const TOOLTIP_TEXT_SELECTOR = '[data-status-calendar-tooltip-text]';
const TOOLTIP_OPEN_ATTRIBUTE = 'data-status-calendar-tooltip-open';
const TOOLTIP_HOVER_ATTRIBUTE = 'data-status-calendar-tooltip-hovered';
const TOOLTIP_FOCUS_ATTRIBUTE = 'data-status-calendar-tooltip-focused';
const TOOLTIP_DISMISSED_ATTRIBUTE = 'data-tooltip-dismissed';
const TODAY_SELECTOR =
  '[data-status-calendar-today], .status-calendar-date--today';
const TOOLTIP_SHIFT_PROPERTY = '--status-calendar-tooltip-shift-x';
const TOOLTIP_VIEWPORT_MARGIN = 16;
const MOSCOW_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const tooltipRoot = (
  target: EventTarget | undefined,
): HTMLElement | undefined => {
  if (!(target instanceof Element)) {
    return;
  }

  const root = target.closest(TOOLTIP_ROOT_SELECTOR);
  if (!(root instanceof HTMLElement)) {
    return;
  }

  return root;
};

const movedOutside = (root: HTMLElement, target: EventTarget | undefined) =>
  !(target instanceof Node) || !root.contains(target);

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

const refreshStatusCalendarTodayIn = (root: ParentNode, now: Date): void => {
  root.querySelectorAll<HTMLElement>(TODAY_SELECTOR).forEach((element) => {
    element.classList.remove('status-calendar-date--today');
    element.removeAttribute('data-status-calendar-today');
    element.querySelector('a, time')?.removeAttribute('aria-current');
  });

  const todayId = moscowDateId(now);
  const today = root.querySelector<HTMLElement>(
    `[data-status-calendar-date="${todayId}"]`,
  );

  if (!today) {
    return;
  }

  today.classList.add('status-calendar-date--today');
  today.dataset.statusCalendarToday = todayId;
  today.querySelector('a, time')?.setAttribute('aria-current', 'date');
};

export const refreshStatusCalendarToday = (now = new Date()): void =>
  refreshStatusCalendarTodayIn(document, now);

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

const closeStatusCalendarTooltip = (root: HTMLElement): void => {
  root.removeAttribute(TOOLTIP_OPEN_ATTRIBUTE);
  root
    .querySelector<HTMLElement>(TOOLTIP_SELECTOR)
    ?.setAttribute('aria-hidden', 'true');
};

const openStatusCalendarTooltip = (root: HTMLElement): void => {
  if (root.hasAttribute(TOOLTIP_DISMISSED_ATTRIBUTE)) {
    return;
  }

  const tooltip = root.querySelector<HTMLElement>(TOOLTIP_SELECTOR);
  const tooltipText = tooltip?.querySelector<HTMLElement>(
    TOOLTIP_TEXT_SELECTOR,
  );
  const summary = root.dataset.statusCalendarTooltipSummary;

  if (!tooltip || !tooltipText || !summary) {
    return;
  }

  tooltipText.textContent = summary;
  tooltip.setAttribute('aria-hidden', 'false');
  root.setAttribute(TOOLTIP_OPEN_ATTRIBUTE, '');
  positionStatusCalendarTooltip(root);
};

const settleStatusCalendarTooltip = (root: HTMLElement): void => {
  if (
    root.hasAttribute(TOOLTIP_HOVER_ATTRIBUTE) ||
    root.hasAttribute(TOOLTIP_FOCUS_ATTRIBUTE)
  ) {
    return;
  }

  root.removeAttribute(TOOLTIP_DISMISSED_ATTRIBUTE);
  closeStatusCalendarTooltip(root);
};

class StatusCalendarYearLifecycleElement extends HTMLElement {
  #interactions?: AbortController;

  connectedCallback(): void {
    if (this.#interactions) {
      return;
    }

    const calendar = this.previousElementSibling;
    if (
      !(calendar instanceof HTMLElement) ||
      !calendar.matches(YEAR_CALENDAR_SELECTOR)
    ) {
      return;
    }

    const interactions = new AbortController();
    this.#interactions = interactions;
    const listenerOptions = { signal: interactions.signal };

    refreshStatusCalendarTodayIn(calendar, new Date());
    calendar.addEventListener(
      'focusin',
      (event) => {
        const root = tooltipRoot(event.target || undefined);

        if (root) {
          root.setAttribute(TOOLTIP_FOCUS_ATTRIBUTE, '');
          openStatusCalendarTooltip(root);
        }
      },
      listenerOptions,
    );
    calendar.addEventListener(
      'pointerover',
      (event) => {
        if (event.pointerType === 'touch') {
          return;
        }

        const root = tooltipRoot(event.target || undefined);

        if (root && movedOutside(root, event.relatedTarget || undefined)) {
          root.setAttribute(TOOLTIP_HOVER_ATTRIBUTE, '');
          openStatusCalendarTooltip(root);
        }
      },
      listenerOptions,
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.defaultPrevented || event.key !== 'Escape') {
          return;
        }

        calendar
          .querySelectorAll<HTMLElement>(
            `${TOOLTIP_ROOT_SELECTOR}[${TOOLTIP_OPEN_ATTRIBUTE}]`,
          )
          .forEach((root) => {
            root.setAttribute(TOOLTIP_DISMISSED_ATTRIBUTE, '');
            closeStatusCalendarTooltip(root);
          });
      },
      listenerOptions,
    );
    calendar.addEventListener(
      'focusout',
      (event) => {
        const root = tooltipRoot(event.target || undefined);

        if (root && movedOutside(root, event.relatedTarget || undefined)) {
          root.removeAttribute(TOOLTIP_FOCUS_ATTRIBUTE);
          settleStatusCalendarTooltip(root);
        }
      },
      listenerOptions,
    );
    calendar.addEventListener(
      'pointerout',
      (event) => {
        if (event.pointerType === 'touch') {
          return;
        }

        const root = tooltipRoot(event.target || undefined);

        if (root && movedOutside(root, event.relatedTarget || undefined)) {
          root.removeAttribute(TOOLTIP_HOVER_ATTRIBUTE);
          settleStatusCalendarTooltip(root);
        }
      },
      listenerOptions,
    );
  }

  disconnectedCallback(): void {
    this.#interactions?.abort();
    this.#interactions = undefined;
  }
}

export const registerStatusCalendarYearInteractions = (): void => {
  if (customElements.get(YEAR_CALENDAR_LIFECYCLE_ELEMENT)) {
    return;
  }

  customElements.define(
    YEAR_CALENDAR_LIFECYCLE_ELEMENT,
    StatusCalendarYearLifecycleElement,
  );
};
