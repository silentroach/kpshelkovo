/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import SiteNav from './SiteNav.astro';

const renderNav = async (pathname: string, variant: 'header' | 'mobile') => {
  const container = await createAstroContainer();

  return container.renderToString(SiteNav, {
    props: {
      variant,
      statusState: 'green',
      statusAriaLabel: 'Статус: всё работает',
    },
    request: new Request(`https://example.com${pathname}`),
  });
};

describe('SiteNav', () => {
  it.each([
    ['header', '/news/', 'page'],
    ['header', '/news/2026/07/report/', 'location'],
    ['mobile', '/status/', 'page'],
    ['mobile', '/status/water/', 'location'],
  ] as const)(
    'marks the current %s navigation destination on %s',
    async (variant, pathname, current) => {
      const html = await renderNav(pathname, variant);

      expect(html).toContain(`aria-current="${current}"`);
    },
  );

  it.each(['header', 'mobile'] as const)(
    'keeps places out of the %s primary navigation during rollout',
    async (variant) => {
      const html = await renderNav('/map/', variant);

      expect(html).not.toContain('href="/map/"');
    },
  );

  it.each(['header', 'mobile'] as const)(
    'marks the tariff parent and exact child in the %s navigation',
    async (variant) => {
      const html = await renderNav('/815/compare/', variant);

      expect(html).toContain('data-current-section');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('текущий раздел');
    },
  );

  it('marks the tariff child as a location on a nested compare page', async () => {
    const html = await renderNav(
      '/815/compare/settlements/shelkovo/',
      'header',
    );

    expect(html).toContain('aria-current="location"');
  });

  it('does not mark a destination on the home page', async () => {
    const html = await renderNav('/', 'header');

    expect(html).not.toContain('aria-current');
    expect(html).not.toContain('data-current-section');
  });

  it('renders one ignored search trigger in the header navigation', async () => {
    const html = await renderNav('/', 'header');

    expect(html.match(/data-search-trigger/g)).toHaveLength(1);
    expect(html).toContain('data-pagefind-ignore="all"');
  });

  it('keeps search outside the hidden mobile navigation', async () => {
    const html = await renderNav('/', 'mobile');

    expect(html).not.toContain('data-search-trigger');
  });
});
