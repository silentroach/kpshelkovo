import { afterEach, describe, expect, it } from 'vitest';

import { hydrateStatusServiceStates } from '../lifecycle.dom';

const START_MS = Date.parse('2026-08-18T10:00:00+03:00');
const END_MS = Date.parse('2026-08-18T11:00:00+03:00');

const renderServiceCard = (): HTMLElement => {
  document.body.innerHTML = `
    <article data-status-service-card data-status-service-state="green">
      <p data-status-service-state-label>В норме</p>
    </article>
  `;

  const card = document.querySelector('[data-status-service-card]');
  if (!(card instanceof HTMLElement)) {
    throw new Error('status service card fixture is missing');
  }

  card.dataset.statusServiceIncidents = JSON.stringify([
    {
      kind: 'maintenance',
      startedAt: START_MS,
      endedAt: END_MS,
    },
  ]);

  return card;
};

const currentCardState = (card: HTMLElement) => ({
  state: card.dataset.statusServiceState,
  label: card.querySelector('[data-status-service-state-label]')?.textContent,
});

afterEach(() => {
  document.body.innerHTML = '';
  delete window.__shelkovoStatusServiceStateHydration;
});

describe('hydrateStatusServiceStates', () => {
  it('keeps a future maintenance window out of the current service state', () => {
    const card = renderServiceCard();

    hydrateStatusServiceStates(document, START_MS - 1);

    expect(currentCardState(card)).toEqual({
      state: 'green',
      label: 'В норме',
    });
  });

  it('marks maintenance active at the exact start boundary', () => {
    const card = renderServiceCard();

    hydrateStatusServiceStates(document, START_MS);

    expect(currentCardState(card)).toEqual({
      state: 'amber',
      label: 'Работы',
    });
  });

  it('clears maintenance at the exact end boundary', () => {
    const card = renderServiceCard();

    hydrateStatusServiceStates(document, END_MS);

    expect(currentCardState(card)).toEqual({
      state: 'green',
      label: 'В норме',
    });
  });
});
