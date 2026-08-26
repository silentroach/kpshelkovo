import type { StatusIncident } from '@/lib/status/types';
import { resolveStatusServiceState } from '@/lib/status/lifecycle';

import type { HomeStatusState, HomeStatusWindow } from './status.types';

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
  red: 'есть проблемы',
} as const satisfies Record<HomeStatusState, string>;

export const getHomeStatusAriaLabel = (state: HomeStatusState): string =>
  `Статус: ${HOME_STATUS_LABELS[state]}`;

export const getHomeStatusState = (
  incidents: readonly StatusIncident[],
  now: number,
): HomeStatusState =>
  resolveStatusServiceState(
    incidents.map((item) => ({
      kind: item.kind,
      service: item.service,
      startedAt: item.started.at.valueOf(),
      endedAt: item.ended?.at.valueOf(),
    })),
    now,
  );

export const getHomeStatusWindows = (
  incidents: readonly Pick<StatusIncident, 'kind' | 'started' | 'ended'>[],
  buildNow: number,
): readonly HomeStatusWindow[] =>
  incidents
    .flatMap((item): HomeStatusWindow[] => {
      const start = item.started.at.valueOf();
      const end = item.ended?.at.valueOf();
      if (end !== undefined && end <= buildNow) {
        return [];
      }

      return [
        {
          kind: item.kind,
          start,
          end,
        },
      ];
    })
    .sort((a, b) => a.start - b.start || (a.end ?? 0) - (b.end ?? 0));

const isHomeStatusWindow = (value: unknown): value is HomeStatusWindow => {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return false;
  }

  const { kind, start, end } = value as {
    readonly kind?: unknown;
    readonly start?: unknown;
    readonly end?: unknown;
  };

  return (
    (kind === 'incident' || kind === 'maintenance') &&
    typeof start === 'number' &&
    Number.isFinite(start) &&
    (end === undefined ||
      (typeof end === 'number' && Number.isFinite(end) && start <= end))
  );
};

const parseHomeStatusWindows = (
  source: string | undefined,
): readonly HomeStatusWindow[] | undefined => {
  if (source === undefined) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(source);

    return Array.isArray(parsed) && parsed.every(isHomeStatusWindow)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

const setHomeStatusState = (
  link: HTMLElement,
  state: HomeStatusState,
): void => {
  const label = getHomeStatusAriaLabel(state);

  link.dataset.homeStatusState = state;
  link.setAttribute('aria-label', label);
  link.setAttribute('title', label);
};

const homeStatusLinks = (root: ParentNode): readonly HTMLElement[] =>
  Array.from(root.querySelectorAll(HOME_STATUS_LINK_SELECTOR)).filter(
    (link): link is HTMLElement => link instanceof HTMLElement,
  );

export const hydrateHomeStatus = (
  root: ParentNode = document,
  now: number = Date.now(),
): void => {
  const links = homeStatusLinks(root);
  if (links.length === 0) {
    return;
  }

  const payload = root.querySelector(HOME_STATUS_WINDOWS_SELECTOR);
  if (!(payload instanceof HTMLScriptElement)) {
    return;
  }

  const windows = parseHomeStatusWindows(payload.textContent ?? undefined);
  if (!windows) {
    return;
  }

  const state = resolveStatusServiceState(
    windows.map((item) => ({
      kind: item.kind,
      startedAt: item.start,
      endedAt: item.end,
    })),
    now,
  );

  links.forEach((link) => setHomeStatusState(link, state));
};

export const installHomeStatusHydration = (
  options: { readonly now?: () => number } = {},
): void => {
  const hydrate = (): void =>
    hydrateHomeStatus(document, options.now?.() ?? Date.now());

  if (window.__shelkovoHomeStatusHydration) {
    hydrate();
    return;
  }

  window.__shelkovoHomeStatusHydration = true;
  hydrate();
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
};
