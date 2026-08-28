import { resolveStatusServiceState } from './lifecycle';
import type { StatusIncidentWindowInput } from './types';
import { formatStatusServiceState } from './service-state';

declare global {
  interface Window {
    __shelkovoStatusServiceStateHydration?: boolean;
  }
}

const STATUS_SERVICE_STATE_SELECTOR =
  '[data-status-service-state-label][data-status-service-incidents]';

const isStatusIncidentWindow = (
  value: unknown,
): value is StatusIncidentWindowInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<StatusIncidentWindowInput>;

  return (
    (candidate.kind === 'incident' || candidate.kind === 'maintenance') &&
    typeof candidate.startedAt === 'number' &&
    Number.isFinite(candidate.startedAt) &&
    (candidate.endedAt === undefined ||
      (typeof candidate.endedAt === 'number' &&
        Number.isFinite(candidate.endedAt)))
  );
};

const parseStatusIncidentWindows = (
  value?: string,
): readonly StatusIncidentWindowInput[] | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) && parsed.every(isStatusIncidentWindow)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

export const hydrateStatusServiceStates = (
  root: ParentNode = document,
  nowMs: number = Date.now(),
): void => {
  root.querySelectorAll(STATUS_SERVICE_STATE_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const incidents = parseStatusIncidentWindows(
      node.dataset.statusServiceIncidents,
    );
    if (!incidents) {
      return;
    }

    const state = resolveStatusServiceState(incidents, nowMs);
    const label = formatStatusServiceState(state);

    if (node.dataset.statusServiceState !== state) {
      node.dataset.statusServiceState = state;
    }
    if (node.textContent !== label) {
      node.textContent = label;
    }
  });
};

export const installStatusServiceStateHydration = (
  options: { readonly now?: () => number } = {},
): void => {
  const hydrate = (): void =>
    hydrateStatusServiceStates(document, options.now?.() ?? Date.now());

  if (window.__shelkovoStatusServiceStateHydration) {
    hydrate();
    return;
  }

  window.__shelkovoStatusServiceStateHydration = true;
  hydrate();
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
};
