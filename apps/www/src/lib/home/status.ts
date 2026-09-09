import {
  parseStatusIncidentWindows,
  resolveStatusServiceState,
  toStatusIncidentWindowInput
} from '@/lib/status/lifecycle';
import type { StatusServiceState } from '@/lib/status/schema';
import type { StatusIncident, StatusIncidentWindowInput } from '@/lib/status/types';

declare global {
  interface Window {
    __shelkovoHomeStatusHydration?: boolean;
  }
}

const HOME_STATUS_LINK_SELECTOR = '[data-home-status-link]';
const HOME_STATUS_WINDOWS_SELECTOR = '[data-home-status-windows]';

export const HOME_STATUS_LABELS = {
  green: 'всё работает',
  amber: 'плановые работы',
  red: 'есть проблемы'
} as const satisfies Record<StatusServiceState, string>;

export const getHomeStatusAriaLabel = (state: StatusServiceState): string =>
  `Статус: ${HOME_STATUS_LABELS[state]}`;

export const getHomeStatusState = (
  incidents: readonly StatusIncident[],
  now: number
): StatusServiceState => resolveStatusServiceState(incidents.map(toStatusIncidentWindowInput), now);

export const getHomeStatusWindows = (
  incidents: readonly Pick<StatusIncident, 'kind' | 'started' | 'ended'>[],
  buildNow: number
): readonly StatusIncidentWindowInput[] =>
  incidents
    .map(toStatusIncidentWindowInput)
    .filter((item) => item.end === undefined || item.end > buildNow)
    .sort((a, b) => a.start - b.start || (a.end ?? 0) - (b.end ?? 0));

const setHomeStatusState = (link: HTMLElement, state: StatusServiceState): void => {
  const label = getHomeStatusAriaLabel(state);

  link.dataset.homeStatusState = state;
  link.setAttribute('aria-label', label);
  link.setAttribute('title', label);
};

const homeStatusLinks = (root: ParentNode): readonly HTMLElement[] =>
  Array.from(root.querySelectorAll(HOME_STATUS_LINK_SELECTOR)).filter(
    (link): link is HTMLElement => link instanceof HTMLElement
  );

export const hydrateHomeStatus = (root: ParentNode = document, now: number = Date.now()): void => {
  const links = homeStatusLinks(root);
  if (links.length === 0) {
    return;
  }

  const payload = root.querySelector(HOME_STATUS_WINDOWS_SELECTOR);
  if (!(payload instanceof HTMLScriptElement)) {
    return;
  }

  const windows = parseStatusIncidentWindows(payload.textContent ?? undefined);
  if (!windows) {
    return;
  }

  const state = resolveStatusServiceState(windows, now);

  links.forEach((link) => setHomeStatusState(link, state));
};

export const installHomeStatusHydration = (options: { readonly now?: () => number } = {}): void => {
  const hydrate = (): void => hydrateHomeStatus(document, options.now?.() ?? Date.now());

  if (window.__shelkovoHomeStatusHydration) {
    hydrate();
    return;
  }

  window.__shelkovoHomeStatusHydration = true;
  hydrate();
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
};
