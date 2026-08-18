import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import KPIStats from './KPIStats.svelte';
import type { Stats } from '../lib/settlement/types';

describe('KPIStats', () => {
  const mockStats: Stats = {
    shelkovoTariff: 4500,
    medianTariff: 3650,
    peerMedianTariff: 3200,
    meanTariff: 3800,
    minTariff: 2800,
    maxTariff: 5200,
    shelkovoRank: 3,
    totalSettlements: 4,
    cheaperCount: 2,
    moreExpensiveCount: 1,
    shelkovoVsMedianPercent: 23,
    shelkovoVsPeerMedianPercent: 41,
    shelkovoVsMeanPercent: 18,
  };

  it('displays median comparison when more expensive', () => {
    const { container } = render(KPIStats, {
      props: { stats: mockStats },
    });

    expect(container.textContent).toContain('3\u00A0200\u00A0₽/сотка');
    expect(container.textContent).toContain('3\u00A0650\u00A0₽/сотка');
    expect(container.textContent).toContain('Шелково: +41%');
    expect(container.textContent).toContain('Шелково: +23%');
  });

  it('displays median comparison when cheaper', () => {
    const cheaperStats: Stats = {
      ...mockStats,
      shelkovoVsMedianPercent: -15,
      shelkovoVsPeerMedianPercent: -8,
    };

    const { container } = render(KPIStats, {
      props: { stats: cheaperStats },
    });

    expect(container.textContent).toContain('Шелково: −15%');
    expect(container.textContent).toContain('Шелково: −8%');
  });

  it('does not render positive or negative deltas for equal medians', () => {
    const equalStats: Stats = {
      ...mockStats,
      shelkovoVsMedianPercent: 0,
      shelkovoVsPeerMedianPercent: 0,
    };

    const { container } = render(KPIStats, {
      props: { stats: equalStats },
    });

    expect(container.textContent).not.toContain('+0%');
    expect(container.textContent).not.toContain('−0%');
  });

  it('renders embedded metrics without a standalone title', () => {
    const { container } = render(KPIStats, {
      props: { stats: mockStats, embed: true },
    });

    expect(container.querySelector('[data-testid="kpi-stats"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="kpi-stats-title"]'),
    ).toBeNull();
  });

  it('renders a standalone metrics title', () => {
    const { container } = render(KPIStats, {
      props: { stats: mockStats },
    });

    expect(container.querySelector('[data-testid="kpi-stats"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="kpi-stats-title"]'),
    ).toBeTruthy();
  });
});
