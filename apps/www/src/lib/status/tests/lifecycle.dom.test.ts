import { afterEach, describe, expect, it } from 'vitest';

import { hydrateStatusServiceStates } from '../lifecycle.dom';

const START_MS = Date.parse('2026-08-18T10:00:00+03:00');
const END_MS = Date.parse('2026-08-18T11:00:00+03:00');

const renderServiceState = (
  kind: 'incident' | 'maintenance',
  overview = false,
): HTMLElement => {
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
      startedAt: START_MS,
      endedAt: END_MS,
    },
  ]);

  return label;
};

const currentServiceState = (label: HTMLElement) => ({
  state: label.dataset.statusServiceState,
  label: label.textContent,
  role: label.getAttribute('role'),
});

afterEach(() => {
  document.body.innerHTML = '';
  delete window.__shelkovoStatusServiceStateHydration;
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
      ended: currentServiceState(label),
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
