import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ComparisonBadge from './ComparisonBadge.svelte';

describe('ComparisonBadge', () => {
  it('renders cheaper badge with delta text', () => {
    const { container } = render(ComparisonBadge, {
      props: {
        delta: 50,
        deltaPercent: 33,
        isCheaper: true,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('−50\u00A0₽');
    expect(container.textContent).toContain('(дешевле на 33%)');

    const badge = container.querySelector('[data-testid="comparison-badge"]');
    expect(badge).toBeTruthy();
  });

  it('renders more expensive badge with delta text', () => {
    const { container } = render(ComparisonBadge, {
      props: {
        delta: -30,
        deltaPercent: -20,
        isCheaper: false,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('+30\u00A0₽');
    expect(container.textContent).toContain('(дороже на 20%)');

    const badge = container.querySelector('[data-testid="comparison-badge"]');
    expect(badge).toBeTruthy();
  });

  it('formats delta with thousands separator', () => {
    const { container } = render(ComparisonBadge, {
      props: {
        delta: 1250,
        deltaPercent: 10,
        isCheaper: true,
        isBaseline: false,
      },
    });

    expect(container.textContent).toContain('−1\u00A0250\u00A0₽');
  });

  it('renders baseline badge', () => {
    const { container } = render(ComparisonBadge, {
      props: {
        delta: 0,
        deltaPercent: 0,
        isCheaper: false,
        isBaseline: true,
      },
    });

    expect(container.textContent).toContain('Наш');

    // Бейдж базового поселка должен рендериться: у обертки есть data-testid.
    const badge = container.querySelector('[data-testid="comparison-badge"]');
    expect(badge).toBeTruthy();
  });

  it('renders nothing when delta is 0 and not baseline', () => {
    const { container } = render(ComparisonBadge, {
      props: {
        delta: 0,
        deltaPercent: 0,
        isCheaper: false,
        isBaseline: false,
      },
    });

    // При ложном условии Svelte рендерит <!---->.
    const badge = container.querySelector('[data-testid="comparison-badge"]');
    expect(badge).toBeFalsy();
  });
});
