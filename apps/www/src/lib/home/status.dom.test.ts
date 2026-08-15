import { afterEach, describe, expect, it } from 'vitest';

import type { StatusIncident } from '@/lib/status/types';

import {
  getHomeStatusMaintenanceWindows,
  hydrateHomeStatus,
  installHomeStatusHydration,
} from './status';

const WINDOW_START = 1779094800000;
const WINDOW_END = 1779105600000;
const DEFAULT_WINDOWS_PAYLOAD = `[{"start":${WINDOW_START},"end":${WINDOW_END}}]`;
const AMBER_ARIA_LABEL = 'Статус: плановые работы';
const GREEN_ARIA_LABEL = 'Статус: всё работает';
const STATUS_LABELS = {
  green: 'всё работает',
  amber: 'плановые работы',
  red: 'есть проблемы',
} as const;
const MAINTENANCE_WINDOW = {
  kind: 'maintenance',
  started: {
    at: new Date(WINDOW_START),
    iso: new Date(WINDOW_START).toISOString(),
    hasTime: true,
  },
  ended: {
    at: new Date(WINDOW_END),
    iso: new Date(WINDOW_END).toISOString(),
    hasTime: true,
  },
} as const satisfies Pick<StatusIncident, 'kind' | 'started' | 'ended'>;

const renderHomeStatus = ({
  state = 'green',
  includePayload = true,
  payload = DEFAULT_WINDOWS_PAYLOAD,
}: {
  readonly state?: 'green' | 'amber' | 'red';
  readonly includePayload?: boolean;
  readonly payload?: string;
} = {}): void => {
  const label = STATUS_LABELS[state];

  document.body.innerHTML = `
    <a
      href="/status/"
      aria-label="Статус: ${label}"
      data-home-status-link
      data-home-status-state="${state}"
    >
      <span>Статус</span>
      <span aria-hidden="true" data-home-status-dot></span>
    </a>
    ${
      includePayload
        ? `<script type="application/json" data-home-status-maintenance-windows>${payload}</script>`
        : ''
    }
  `;
};

const getStatusLink = (): HTMLElement =>
  document.querySelector('[data-home-status-link]') as HTMLElement;

const getStatusLinks = (): readonly HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-home-status-link]')).filter(
    (link): link is HTMLElement => link instanceof HTMLElement,
  );

afterEach(() => {
  document.body.innerHTML = '';
  delete window.__shelkovoHomeStatusHydration;
});

describe('getHomeStatusMaintenanceWindows', () => {
  it('keeps a finite maintenance window that is active at build time', () => {
    const buildNow = WINDOW_START + 1;

    expect(
      getHomeStatusMaintenanceWindows([MAINTENANCE_WINDOW], buildNow),
    ).toEqual([{ start: WINDOW_START, end: WINDOW_END }]);
  });
});

describe('hydrateHomeStatus', () => {
  it('changes green to amber when now is inside an embedded window', () => {
    renderHomeStatus();

    hydrateHomeStatus(document, WINDOW_START + 1);

    expect(getStatusLink().dataset.homeStatusState).toBe('amber');
  });

  it('keeps green before the first embedded window starts', () => {
    renderHomeStatus();

    hydrateHomeStatus(document, WINDOW_START - 1);

    expect(getStatusLink().dataset.homeStatusState).toBe('green');
  });

  it('keeps green when now equals the embedded window end', () => {
    renderHomeStatus();

    hydrateHomeStatus(document, WINDOW_END);

    expect(getStatusLink().dataset.homeStatusState).toBe('green');
  });

  it('clears build-time amber when the embedded window has ended', () => {
    renderHomeStatus({ state: 'amber' });

    hydrateHomeStatus(document, WINDOW_END);

    expect(getStatusLink().dataset.homeStatusState).toBe('green');
    expect(getStatusLink().getAttribute('aria-label')).toBe(GREEN_ARIA_LABEL);
  });

  it('changes green to amber when now equals the embedded window start', () => {
    renderHomeStatus();

    hydrateHomeStatus(document, WINDOW_START);

    expect(getStatusLink().dataset.homeStatusState).toBe('amber');
  });

  it('keeps red when now is inside a maintenance window', () => {
    renderHomeStatus({ state: 'red' });

    hydrateHomeStatus(document, WINDOW_START + 1);

    expect(getStatusLink().dataset.homeStatusState).toBe('red');
  });

  it('updates the accessible label and hover hint with the state', () => {
    renderHomeStatus();

    hydrateHomeStatus(document, WINDOW_START + 1);

    expect(getStatusLink().getAttribute('aria-label')).toBe(AMBER_ARIA_LABEL);
    expect(getStatusLink().getAttribute('title')).toBe(AMBER_ARIA_LABEL);
  });

  it('updates every rendered status link', () => {
    renderHomeStatus();
    getStatusLink().insertAdjacentHTML(
      'afterend',
      `<a href="/status/" aria-label="${GREEN_ARIA_LABEL}" data-home-status-link data-home-status-state="green">Статус</a>`,
    );

    hydrateHomeStatus(document, WINDOW_START + 1);

    expect(
      getStatusLinks().map((link) => ({
        state: link.dataset.homeStatusState,
        label: link.getAttribute('aria-label'),
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "label": "Статус: плановые работы",
          "state": "amber",
        },
        {
          "label": "Статус: плановые работы",
          "state": "amber",
        },
      ]
    `);
  });

  it('does not throw and does not change state when embedded JSON is missing', () => {
    renderHomeStatus({ includePayload: false });

    expect(() => hydrateHomeStatus(document, WINDOW_START + 1)).not.toThrow();
    expect(getStatusLink().dataset.homeStatusState).toBe('green');
    expect(getStatusLink().getAttribute('aria-label')).toBe(GREEN_ARIA_LABEL);
  });

  it('does not throw and does not change state when embedded JSON is malformed', () => {
    renderHomeStatus({ payload: '{' });

    expect(() => hydrateHomeStatus(document, WINDOW_START + 1)).not.toThrow();
    expect(getStatusLink().dataset.homeStatusState).toBe('green');
    expect(getStatusLink().getAttribute('aria-label')).toBe(GREEN_ARIA_LABEL);
  });
});

describe('installHomeStatusHydration', () => {
  it('rehydrates the home status after Astro client navigation', () => {
    const now = (): number => WINDOW_START + 1;

    renderHomeStatus({ payload: '[]' });
    installHomeStatusHydration({ now });

    renderHomeStatus();
    document.dispatchEvent(new Event('astro:page-load'));

    expect(getStatusLink().dataset.homeStatusState).toBe('amber');

    renderHomeStatus();
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(getStatusLink().dataset.homeStatusState).toBe('amber');
  });
});
