import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import Hero from './Hero.svelte';

describe('Hero', () => {
  it('renders title and subtitle', () => {
    const { container } = render(Hero, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle'
      }
    });

    expect(container.textContent).toContain('Test Title');
    expect(container.textContent).toContain('Test Subtitle');
  });

  it('uses semantic h1 for title', () => {
    const { container } = render(Hero, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle'
      }
    });

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent).toContain('Test Title');
  });

  it('uses shared page typography primitives instead of a local hero panel', () => {
    const { container } = render(Hero, {
      props: {
        title: 'Test Title',
        subtitle: 'Test Subtitle'
      }
    });

    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('h1')?.className).toContain('ui-page-title');
    expect(container.querySelector('p')?.className).toContain('ui-copy');
  });

  it('renders subtitle link when provided', () => {
    const { container } = render(Hero, {
      props: {
        title: 'Test Title',
        subtitle: 'Сравнение по цене и',
        subtitleLinkHref: '/815/compare/rating/',
        subtitleLinkText: 'рейтингу'
      }
    });

    const link = container.querySelector('a[href="/815/compare/rating/"]');
    expect(link?.textContent).toContain('рейтингу');
    expect(link?.className).toContain('ui-link');
  });
});
