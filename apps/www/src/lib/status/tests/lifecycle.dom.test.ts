import { afterEach, describe, expect, it, vi } from 'vitest';

import { hydrateStatusServiceStates, installStatusServiceStateHydration } from '../lifecycle.dom';

const START_MS = Date.parse('2026-08-18T10:00:00+03:00');
const END_MS = Date.parse('2026-08-18T11:00:00+03:00');

const renderServiceState = (kind: 'incident' | 'maintenance', overview = false): HTMLElement => {
  const state = `
    <p
      data-status-service-state-label
      data-status-service-state="green"
      role="status"
    >В норме</p>
  `;
  document.body.innerHTML = overview
    ? `<article data-status-service-card>${state}</article>`
    : `<section aria-label="Текущее состояние">${state}</section>`;

  const label = document.querySelector('[data-status-service-state-label]');
  if (!(label instanceof HTMLElement)) {
    throw new Error('status service state fixture is missing');
  }

  label.dataset.statusServiceIncidents = JSON.stringify([
    {
      kind,
      start: START_MS,
      end: END_MS
    }
  ]);

  return label;
};

const currentServiceState = (label: HTMLElement) => ({
  state: label.dataset.statusServiceState,
  label: label.textContent,
  role: label.getAttribute('role')
});

afterEach(() => {
  document.body.innerHTML = '';
  delete window.__shelkovoStatusServiceStateHydration;
  vi.restoreAllMocks();
});

describe('hydrateStatusServiceStates', () => {
  it('updates a detail summary after a future incident starts and ends', () => {
    const label = renderServiceState('incident');
    const states = [currentServiceState(label)];

    hydrateStatusServiceStates(document, START_MS - 1);
    states.push(currentServiceState(label));
    hydrateStatusServiceStates(document, START_MS);
    states.push(currentServiceState(label));
    hydrateStatusServiceStates(document, END_MS);
    states.push(currentServiceState(label));

    expect(states).toMatchInlineSnapshot(`
      [
        {
          "label": "В норме",
          "role": "status",
          "state": "green",
        },
        {
          "label": "В норме",
          "role": "status",
          "state": "green",
        },
        {
          "label": "Инцидент",
          "role": "status",
          "state": "red",
        },
        {
          "label": "В норме",
          "role": "status",
          "state": "green",
        },
      ]
    `);
  });

  it('continues to hydrate the overview service card', () => {
    const label = renderServiceState('maintenance', true);
    const card = document.querySelector('[data-status-service-card]');

    hydrateStatusServiceStates(document, START_MS);
    const active = currentServiceState(label);
    hydrateStatusServiceStates(document, END_MS);

    expect({
      active,
      cardFound: card instanceof HTMLElement,
      ended: currentServiceState(label)
    }).toMatchInlineSnapshot(`
      {
        "active": {
          "label": "Работы",
          "role": "status",
          "state": "amber",
        },
        "cardFound": true,
        "ended": {
          "label": "В норме",
          "role": "status",
          "state": "green",
        },
      }
    `);
  });
});

describe('installStatusServiceStateHydration', () => {
  it('hydrates current and swapped labels without duplicating navigation listeners', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    let nowMs = START_MS - 1;
    const options = { now: () => nowMs };

    try {
      const initial = renderServiceState('incident', true);
      installStatusServiceStateHydration(options);
      const states = [currentServiceState(initial)];

      const second = initial.cloneNode(true);
      if (!(second instanceof HTMLElement)) {
        throw new Error('Expected cloned service state');
      }
      initial.after(second);
      nowMs = START_MS;
      installStatusServiceStateHydration(options);
      states.push(currentServiceState(initial), currentServiceState(second));

      const swapped = renderServiceState('maintenance');
      document.dispatchEvent(new Event('astro:after-swap'));
      states.push(currentServiceState(swapped));

      nowMs = END_MS;
      document.dispatchEvent(new Event('astro:page-load'));
      states.push(currentServiceState(swapped));

      expect(states).toMatchInlineSnapshot(`
        [
          {
            "label": "В норме",
            "role": "status",
            "state": "green",
          },
          {
            "label": "Инцидент",
            "role": "status",
            "state": "red",
          },
          {
            "label": "Инцидент",
            "role": "status",
            "state": "red",
          },
          {
            "label": "Работы",
            "role": "status",
            "state": "amber",
          },
          {
            "label": "В норме",
            "role": "status",
            "state": "green",
          },
        ]
      `);
      expect(
        addEventListener.mock.calls
          .filter(([type]) => type === 'astro:after-swap' || type === 'astro:page-load')
          .map(([type]) => type)
      ).toMatchInlineSnapshot(`
        [
          "astro:after-swap",
          "astro:page-load",
        ]
      `);
    } finally {
      addEventListener.mock.calls.forEach(([type, listener]) => {
        if (type === 'astro:after-swap' || type === 'astro:page-load') {
          document.removeEventListener(type, listener);
        }
      });
    }
  });
});
