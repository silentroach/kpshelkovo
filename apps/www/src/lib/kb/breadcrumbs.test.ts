import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPage } from './types';

let kbBreadcrumbs: typeof import('./breadcrumbs').kbBreadcrumbs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ kbBreadcrumbs } = await import('./breadcrumbs'));
});

const page = (input: {
  readonly title: string;
  readonly routeSlug?: string;
}): KbPage => ({
  title: input.title,
  flags: [],
  url: input.routeSlug ? `/kb/${input.routeSlug}/` : '/kb/',
  canonical: input.routeSlug
    ? `https://example.com/kb/${input.routeSlug}/`
    : 'https://example.com/kb/',
  routeSlug: input.routeSlug,
  isSection: !input.routeSlug,
  body: '',
  mentions: [],
});

describe('kbBreadcrumbs', () => {
  it('keeps the root page as the current breadcrumb', () => {
    const root = page({ title: 'База знаний' });

    expect(kbBreadcrumbs(root, [root])).toEqual([
      { label: 'Главная', href: '/' },
      { label: 'База знаний' },
    ]);
  });

  it('includes existing parent pages for nested KB articles', () => {
    const root = page({ title: 'База знаний' });
    const internet = page({
      title: 'Интернет',
      routeSlug: 'services/internet',
    });
    const fiber = page({
      title: 'Оптоволокно',
      routeSlug: 'services/internet/fiber',
    });

    expect(kbBreadcrumbs(fiber, [root, internet, fiber])).toEqual([
      { label: 'Главная', href: '/' },
      { label: 'База знаний', href: '/kb/' },
      { label: 'Интернет', href: '/kb/services/internet/' },
      { label: 'Оптоволокно' },
    ]);
  });

  it('skips route prefixes that do not have their own page', () => {
    const root = page({ title: 'База знаний' });
    const fiber = page({
      title: 'Оптоволокно',
      routeSlug: 'services/internet/fiber',
    });

    expect(kbBreadcrumbs(fiber, [root, fiber])).toEqual([
      { label: 'Главная', href: '/' },
      { label: 'База знаний', href: '/kb/' },
      { label: 'Оптоволокно' },
    ]);
  });
});
