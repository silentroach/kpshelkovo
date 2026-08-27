const TOOLTIP_ROOT_SELECTOR = '[data-status-calendar-tooltip-root]';
const TOOLTIP_LINK_SELECTOR = '[data-status-calendar-day-link]';

let installed = false;

const tooltipRoot = (
  target: EventTarget | undefined,
): HTMLElement | undefined =>
  target instanceof Element
    ? (target.closest(TOOLTIP_ROOT_SELECTOR) as HTMLElement | undefined)
    : undefined;

const movedOutside = (root: HTMLElement, target: EventTarget | undefined) =>
  !(target instanceof Node) || !root.contains(target);

export const installStatusCalendarYearTooltips = (): void => {
  if (installed) {
    return;
  }

  installed = true;
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape') {
      return;
    }

    const target =
      event.target instanceof Element ? event.target : document.activeElement;
    const link = target?.closest(TOOLTIP_LINK_SELECTOR);
    const root = tooltipRoot(link || undefined);

    root?.setAttribute('data-tooltip-dismissed', '');
  });
  document.addEventListener('focusout', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root && movedOutside(root, event.relatedTarget || undefined)) {
      root.removeAttribute('data-tooltip-dismissed');
    }
  });
  document.addEventListener('pointerout', (event) => {
    const root = tooltipRoot(event.target || undefined);

    if (root && movedOutside(root, event.relatedTarget || undefined)) {
      root.removeAttribute('data-tooltip-dismissed');
    }
  });
};
