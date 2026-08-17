import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import SettlementCard from './SettlementCard.svelte';
import type { ExplorerSettlement } from '../lib/explorer';
import type { ComparisonResult } from '../lib/settlement/types';

const mockSettlement: ExplorerSettlement = {
  name: 'Тестовый поселок',
  shortName: 'Тестово',
  slug: 'testovo',
  managementCompany: 'УК Тестово',
  isBaseline: false,
  rating: 64,
  location: {
    lat: 55.5,
    lng: 37.5,
    district: 'Тестовский район',
  },
  tariff: {
    normalizedPerSotkaMonth: 100,
    normalizedIsEstimate: false,
  },
};

const mockComparisonCheaper: ComparisonResult = {
  tariffDelta: 50,
  tariffDeltaPercent: 33,
  isCheaper: true,
};

const mockComparisonExpensive: ComparisonResult = {
  tariffDelta: 50,
  tariffDeltaPercent: 33,
  isCheaper: false,
};

describe('SettlementCard', () => {
  it('renders settlement name and location', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('Тестово');
    expect(container.textContent).toContain('Тестовский район');
  });

  it('uses the shared shell primitive as its card surface', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    const card = container.querySelector('[data-testid="settlement-card"]');
    expect(card?.className).toContain('ui-shell');
    expect(card?.className).not.toContain('rounded-sm');
  });

  it('renders tariff formatted correctly', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('100 ₽/сотка');
  });

  it('renders rank as plain text in header', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    expect(
      container.querySelector('[data-testid="tariff-rank-label"]')?.textContent,
    ).toContain('1 / 3');
  });

  it('renders estimated tariff with tilde and hint', () => {
    const settlement = {
      ...mockSettlement,
      tariff: {
        normalizedPerSotkaMonth: 1200,
        normalizedIsEstimate: true,
      },
    };

    const { container } = render(SettlementCard, {
      props: {
        settlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('~1');
    expect(container.textContent).toContain('₽/сотка');
    expect(
      container.querySelector(
        '[title="Тариф приведен к сотке автоматически."]',
      ),
    ).toBeTruthy();
  });

  it('renders "дешевле на" for cheaper settlement', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('дешевле на');
    expect(container.textContent).toContain('50');
  });

  it('renders "дороже на" for more expensive settlement', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonExpensive,
        rank: 3,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('дороже на');
    expect(container.textContent).toContain('50');
  });

  it('renders "базовый тариф" for baseline settlement', () => {
    const baselineSettlement = { ...mockSettlement, isBaseline: true };
    const { container } = render(SettlementCard, {
      props: {
        settlement: baselineSettlement,
        rank: 2,
        total: 3,
        isBaseline: true,
      },
    });

    expect(container.textContent).toContain('базовый тариф');
    expect(container.textContent).toContain('наш');
  });

  it('renders title link to detail page', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    const link = container.querySelector('h3 a[href*="settlements/testovo/"]');
    expect(link).toBeTruthy();
  });

  it('renders rabstvo badge link when settlement is flagged', () => {
    const flagged = { ...mockSettlement, rabstvo: true };

    const { container } = render(SettlementCard, {
      props: {
        settlement: flagged,
        comparison: mockComparisonCheaper,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    const badge = container.querySelector(
      '[data-testid="rabstvo-badge"]',
    ) as HTMLAnchorElement | null;

    expect(badge?.textContent).toContain('рабство');
    expect(badge?.getAttribute('href')).toBe('https://t.me/obmandachniki');
    expect(badge?.getAttribute('title')).toContain('Коттеджное рабство');
  });

  it('handles missing comparison gracefully', () => {
    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        rank: 1,
        total: 3,
        isBaseline: false,
      },
    });

    // Должна рендериться без ошибок.
    expect(
      container.querySelector('[data-testid="settlement-card"]'),
    ).toBeTruthy();
    // Должен рендериться тариф, но не текст сравнения.
    expect(container.textContent).toContain('100 ₽/сотка');
    expect(container.textContent).not.toContain('дешевле на');
    expect(container.textContent).not.toContain('дороже на');
  });

  it('does not show comparison text when tariff delta is zero', () => {
    const zeroComparison: ComparisonResult = {
      tariffDelta: 0,
      tariffDeltaPercent: 0,
      isCheaper: false,
    };

    const { container } = render(SettlementCard, {
      props: {
        settlement: mockSettlement,
        comparison: zeroComparison,
        rank: 2,
        total: 3,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('100 ₽/сотка');
    expect(container.textContent).not.toContain('дешевле на 0');
    expect(container.textContent).not.toContain('дороже на 0');
    expect(container.textContent).not.toContain('базовый тариф');
  });
});
