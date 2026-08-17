import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TariffRank from './TariffRank.svelte';

describe('TariffRank', () => {
  it('renders strip container', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 2,
        base: 4,
        total: 9,
        tone: 'success',
      },
    });

    expect(
      container.querySelector('[data-testid="tariff-rank-strip"]'),
    ).toBeTruthy();
  });

  it('keeps the number of markers constant as the list grows', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 30,
        base: 60,
        total: 100,
        tone: 'warning',
      },
    });

    expect(
      container.querySelectorAll(
        '[data-testid="tariff-rank-current"], [data-testid="tariff-rank-base"]',
      ),
    ).toHaveLength(2);
  });

  it('marks current and baseline positions separately', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 2,
        base: 5,
        total: 6,
        tone: 'success',
      },
    });

    expect(
      container.querySelector('[data-testid="tariff-rank-current"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="tariff-rank-base"]'),
    ).toBeTruthy();
    expect({
      current: container
        .querySelector('[data-testid="tariff-rank-current"]')
        ?.getAttribute('style'),
      base: container
        .querySelector('[data-testid="tariff-rank-base"]')
        ?.getAttribute('style'),
    }).toMatchInlineSnapshot(`
      {
        "base": "left: 80%;",
        "current": "left: 20%;",
      }
    `);
  });

  it('uses single marker when current rank matches baseline', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 4,
        base: 4,
        total: 8,
        tone: 'info',
      },
    });

    expect(
      container.querySelector('[data-testid="tariff-rank-current"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="tariff-rank-base"]'),
    ).toBeNull();
  });

  it('exposes an accessible summary', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 6,
        base: 3,
        total: 10,
        tone: 'warning',
      },
    });

    expect(
      container.querySelector('[aria-label="Ранг 6 из 10. Дороже базового."]'),
    ).toBeTruthy();
  });

  it('uses flat markers without decorative elevation vocabulary', () => {
    const { container } = render(TariffRank, {
      props: {
        rank: 2,
        base: 4,
        total: 9,
        tone: 'success',
      },
    });

    expect(container.innerHTML).not.toMatch(
      /shadow|ring-\[|bg-card|border-card/,
    );
  });
});
