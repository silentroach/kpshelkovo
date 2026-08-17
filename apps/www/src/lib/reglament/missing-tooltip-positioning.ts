const helpSelector = '.reglament-missing-help';
const openHelpSelector = `${helpSelector}:is(:hover, :focus-within)`;
const tooltipSelector = '.reglament-missing-tooltip';
const tooltipGap = 6;
const tooltipGutter = 8;
const tooltipMaxWidth = 288;
const overflowTolerance = 1;

let positionRaf = 0;
let viewportListenersBound = false;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));
// Horizontal overflow can make the computed overflow-y `auto` without a vertical scroll range.
const clipsAxis = (
  overflow: string,
  scrollSize: number,
  clientSize: number,
): boolean =>
  overflow !== 'visible' &&
  (overflow !== 'auto' || scrollSize > clientSize + overflowTolerance);

const visibleBounds = (help: HTMLElement) => {
  let left = tooltipGutter;
  let right = window.innerWidth - tooltipGutter;
  let top = tooltipGutter;
  let bottom = window.innerHeight - tooltipGutter;
  let ancestor = help.parentElement;

  while (ancestor) {
    const style = getComputedStyle(ancestor);
    const rect = ancestor.getBoundingClientRect();

    if (
      clipsAxis(style.overflowX, ancestor.scrollWidth, ancestor.clientWidth)
    ) {
      left = Math.max(left, rect.left + tooltipGutter);
      right = Math.min(right, rect.right - tooltipGutter);
    }

    if (
      clipsAxis(style.overflowY, ancestor.scrollHeight, ancestor.clientHeight)
    ) {
      top = Math.max(top, rect.top + tooltipGutter);
      bottom = Math.min(bottom, rect.bottom - tooltipGutter);
    }

    ancestor = ancestor.parentElement;
  }

  return { left, right, top, bottom };
};

const positionReglamentMissingTooltip = (help: HTMLElement): void => {
  const trigger = help.querySelector<HTMLButtonElement>('button');
  const tooltip = help.querySelector<HTMLElement>(tooltipSelector);

  if (!trigger || !tooltip) return;

  const bounds = visibleBounds(help);
  const triggerRect = trigger.getBoundingClientRect();
  const width = Math.min(
    tooltipMaxWidth,
    Math.max(0, bounds.right - bounds.left),
  );

  tooltip.style.right = 'auto';
  tooltip.style.width = `${String(width)}px`;

  const height = tooltip.offsetHeight;
  const left = clamp(triggerRect.left, bounds.left, bounds.right - width);
  const below = triggerRect.bottom + tooltipGap;
  const above = triggerRect.top - tooltipGap - height;
  const spaceBelow = bounds.bottom - below;
  const spaceAbove = triggerRect.top - tooltipGap - bounds.top;
  const side =
    spaceBelow >= height || (spaceAbove < height && spaceBelow >= spaceAbove)
      ? 'below'
      : 'above';
  const preferredTop = side === 'below' ? below : above;
  const top = clamp(preferredTop, bounds.top, bounds.bottom - height);

  tooltip.dataset.reglamentTooltipSide = side;
  tooltip.style.left = `${String(left)}px`;
  tooltip.style.top = `${String(top)}px`;
};

const positionOpenReglamentMissingTooltips = (): void => {
  document
    .querySelectorAll<HTMLElement>(openHelpSelector)
    .forEach(positionReglamentMissingTooltip);
};

const scheduleOpenReglamentMissingTooltips = (): void => {
  if (positionRaf) return;

  positionRaf = requestAnimationFrame(() => {
    positionRaf = 0;
    positionOpenReglamentMissingTooltips();
  });
};

const bindViewportListeners = (): void => {
  if (viewportListenersBound) return;

  window.addEventListener('scroll', scheduleOpenReglamentMissingTooltips, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', scheduleOpenReglamentMissingTooltips);
  viewportListenersBound = true;
};

const bindReglamentMissingTooltip = (help: HTMLElement): void => {
  if (help.dataset.reglamentMissingTooltipBound === 'true') return;

  const position = (): void => positionReglamentMissingTooltip(help);

  help.dataset.reglamentMissingTooltipBound = 'true';
  help.addEventListener('pointerenter', position);
  help.addEventListener('focusin', position);
  help.addEventListener('touchstart', position, { passive: true });
};

export const hydrateReglamentMissingTooltips = (scope?: ParentNode): void => {
  const rootScope =
    scope ?? (typeof document === 'undefined' ? undefined : document);

  if (!rootScope) return;

  bindViewportListeners();
  rootScope
    .querySelectorAll<HTMLElement>(helpSelector)
    .forEach(bindReglamentMissingTooltip);
};
