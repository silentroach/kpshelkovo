/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import SiteNav from './SiteNav.astro';

const window = new Window();
afterAll(() => window.happyDOM.close());

const renderNav = async (pathname: string, variant: 'header' | 'mobile') => {
  const container = await createAstroContainer();

  return container.renderToString(SiteNav, {
    props: {
      variant,
      statusState: 'green',
      statusAriaLabel: 'Статус: всё работает'
    },
    request: new Request(`https://example.com${pathname}`)
  });
};

const renderNavElement = async (pathname: string, variant: 'header' | 'mobile') => {
  const element = window.document.createElement('div');
  element.innerHTML = await renderNav(pathname, variant);
  return element;
};

const directoryDestinations = [
  ['/map/', '/map/place/'],
  ['/kb/', '/kb/document/'],
  ['/sarafan/', '/sarafan/contact/'],
  ['/ukogo/', '/ukogo/group/']
] as const;

describe('SiteNav', () => {
  it.each(['header', 'mobile'] as const)(
    'temporarily omits events from the %s navigation',
    async (variant) => {
      expect(await renderNav('/events/', variant)).not.toContain('href="/events/"');
      expect(await renderNav('/events/2026/09/19/', variant)).not.toContain('aria-current');
    }
  );
  it.each([
    ['header', '/news/', 'page'],
    ['header', '/news/2026/07/report/', 'location'],
    ['mobile', '/status/', 'page'],
    ['mobile', '/status/water/', 'location']
  ] as const)(
    'marks the current %s navigation destination on %s',
    async (variant, pathname, current) => {
      const html = await renderNav(pathname, variant);

      expect(html).toContain(`aria-current="${current}"`);
    }
  );

  it.each(['header', 'mobile'] as const)(
    'links to the map from the %s primary navigation',
    async (variant) => {
      const html = await renderNav('/map/', variant);

      expect(html).toContain('href="/map/" aria-current="page"');
    }
  );

  describe.each(['header', 'mobile'] as const)('%s groups', (variant) => {
    it('keeps the top-level order and each destination in its group only', async () => {
      const element = await renderNavElement('/', variant);
      const groups = element.querySelectorAll('[data-site-nav-dropdown], .site-nav-mobile-group');

      expect(
        Array.from(
          element.querySelectorAll('nav > a, nav > div'),
          (item) => item.querySelector('button, p')?.textContent?.trim() ?? item.textContent?.trim()
        )
      ).toMatchInlineSnapshot(`
        [
          "Новости",
          "Тариф 815",
          "Справочник",
          "Отзывы",
          "Статус",
        ]
      `);
      expect(
        Array.from(groups, (group) =>
          Array.from(group.querySelectorAll('a'), (link) => link.getAttribute('href'))
        )
      ).toMatchInlineSnapshot(`
        [
          [
            "/815/compare/",
            "/815/regulation/",
          ],
          [
            "/map/",
            "/kb/",
            "/sarafan/",
            "/ukogo/",
          ],
        ]
      `);
      for (const [href] of directoryDestinations) {
        expect(element.querySelectorAll(`a[href="${href}"]`)).toHaveLength(1);
      }
      expect(element.querySelector('a[href="/directory/"]')).toBeFalsy();
      expect(element.querySelectorAll('[data-home-status-link]')).toHaveLength(1);
      expect(element.querySelector('[data-home-status-dot]')).toBeTruthy();
      if (variant === 'mobile') {
        expect(element.querySelector('button, details, [hidden]')).toBeFalsy();
      } else {
        expect(
          element.querySelector('nav')?.lastElementChild?.hasAttribute('data-search-trigger')
        ).toBe(true);
      }
    });

    it.each(
      directoryDestinations.flatMap(
        ([href, nested]) =>
          [
            [href, href, 'page'],
            [href, nested, 'location'],
            [href, href.slice(0, -1), 'page']
          ] as const
      )
    )('marks %s at %s as %s', async (href, pathname, current) => {
      const element = await renderNavElement(pathname, variant);
      const currentLink = element.querySelector(`a[href="${href}"]`);
      const currentGroup = currentLink?.closest('[data-current-section]');

      expect(
        Array.from(element.querySelectorAll('[aria-current]'), (link) => ({
          href: link.getAttribute('href'),
          current: link.getAttribute('aria-current')
        }))
      ).toEqual([{ href, current }]);
      expect(element.querySelectorAll('[data-current-section]')).toHaveLength(1);
      expect(currentGroup?.querySelector('button, p')?.textContent).toMatch(
        /Справочник\s*, текущий раздел/
      );
    });

    it.each([
      ['/map/?p=SHP-C34', '/map/', 'page'],
      ['/ukogo/group/kind/', '/ukogo/', 'location'],
      ['/ukogo/group/kind/offer/', '/ukogo/', 'location'],
      ['/ukogo/owners/neighbor/', '/ukogo/', 'location']
    ] as const)('keeps the current destination for %s', async (pathname, href, current) => {
      const element = await renderNavElement(pathname, variant);

      expect(element.querySelector(`a[href="${href}"]`)?.getAttribute('aria-current')).toBe(
        current
      );
      expect(element.querySelectorAll('[data-current-section]')).toHaveLength(1);
      expect(element.querySelector('[data-current-section]')?.textContent).toContain('Справочник');
    });

    it.each(['/', '/news/', '/reviews/', '/status/', '/ukogomore/', '/maps/'])(
      'does not mark either group outside their destinations on %s',
      async (pathname) => {
        const element = await renderNavElement(pathname, variant);

        expect(element.querySelector('[data-current-section]')).toBeFalsy();
        expect(element.textContent).not.toContain('текущий раздел');
      }
    );
  });

  it('gives each desktop button its own submenu', async () => {
    const element = await renderNavElement('/', 'header');
    const buttons = element.querySelectorAll('[data-site-nav-dropdown-button]');
    const controls = Array.from(buttons, (button) => button.getAttribute('aria-controls'));

    expect(buttons).toHaveLength(2);
    expect(new Set(controls).size).toBe(2);
    for (const button of buttons) {
      const id = button.getAttribute('aria-controls');
      expect(id).toBeTruthy();
      expect(element.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
      expect(button.parentElement?.querySelector('[data-site-nav-dropdown-menu]')?.id).toBe(id);
      expect(button.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it.each(['header', 'mobile'] as const)(
    'marks the tariff parent and exact child in the %s navigation',
    async (variant) => {
      const html = await renderNav('/815/compare/', variant);

      expect(html).toContain('data-current-section');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('текущий раздел');
    }
  );

  it('marks the tariff child as a location on a nested compare page', async () => {
    const html = await renderNav('/815/compare/settlements/shelkovo/', 'header');

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
