// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const highlightSearchTerms = vi.hoisted(() => vi.fn(async () => {}));
const openSearchDialog = vi.hoisted(() => vi.fn());

vi.mock('@/lib/search/highlight', () => ({ highlightSearchTerms }));
vi.mock('@/components/search/lazy', () => ({ openSearchDialog }));

import '../site-runtime';

beforeEach(() => {
  highlightSearchTerms.mockClear();
  openSearchDialog.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
});

describe('search highlights', () => {
  it('runs after an Astro navigation with the destination query', () => {
    history.replaceState({}, '', '/news/?h=tariff');

    document.dispatchEvent(new Event('astro:page-load'));

    expect(highlightSearchTerms).toHaveBeenCalledOnce();
    expect(highlightSearchTerms).toHaveBeenCalledWith(location.href);
  });
});

describe('search dialog loader', () => {
  it('loads the dialog on demand and forwards the exact opener', async () => {
    document.body.innerHTML = `
      <button type="button" data-search-trigger>
        <span>Search</span>
      </button>
    `;
    const opener = document.querySelector<HTMLButtonElement>(
      '[data-search-trigger]',
    );
    const icon = opener?.querySelector('span');
    if (!opener || !icon) {
      throw new Error('Expected search trigger fixture');
    }

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    icon.dispatchEvent(click);

    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(openSearchDialog).toHaveBeenCalledWith(opener);
    expect(click.defaultPrevented).toBe(true);
  });

  it('drops a pending open request when Astro replaces the page', async () => {
    document.body.innerHTML = `
      <button type="button" data-search-trigger>Search</button>
    `;
    const opener = document.querySelector<HTMLButtonElement>(
      '[data-search-trigger]',
    );
    if (!opener) {
      throw new Error('Expected search trigger fixture');
    }

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new Event('astro:before-swap'));
    await import('@/components/search/lazy');

    expect(openSearchDialog).not.toHaveBeenCalled();
  });
});

describe('site header menu', () => {
  it('closes after a pointer press outside', () => {
    document.body.innerHTML = `
      <button type="button">Outside</button>
      <details class="site-header-menu" open>
        <summary>Menu</summary>
      </details>
    `;

    const outside = document.querySelector<HTMLElement>('button');
    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    if (!outside || !menu) {
      throw new Error('Expected open site header menu fixture');
    }

    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(menu.open).toBe(false);
  });

  it('stays open after a pointer press inside', () => {
    document.body.innerHTML = `
      <details class="site-header-menu" open>
        <summary>Menu</summary>
        <a href="/news/">News</a>
      </details>
    `;

    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    const link = menu?.querySelector<HTMLAnchorElement>('a');
    if (!menu || !link) {
      throw new Error('Expected open site header menu fixture');
    }

    link.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(menu.open).toBe(true);
  });

  it('closes when search is activated without a pointer press', () => {
    document.body.innerHTML = `
      <button type="button" data-search-trigger>Search</button>
      <details class="site-header-menu" open>
        <summary>Menu</summary>
      </details>
    `;

    const searchTrigger = document.querySelector<HTMLButtonElement>(
      '[data-search-trigger]',
    );
    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    if (!searchTrigger || !menu) {
      throw new Error('Expected search trigger and open site header menu');
    }

    searchTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(menu.open).toBe(false);
  });

  it('closes on Escape and returns focus to its summary', () => {
    document.body.innerHTML = `
      <details class="site-header-menu" open>
        <summary>Menu</summary>
        <a href="/news/">News</a>
      </details>
    `;

    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    const summary = menu?.querySelector<HTMLElement>('summary');
    const link = menu?.querySelector<HTMLAnchorElement>('a');
    if (!menu || !summary || !link) {
      throw new Error('Expected site header menu fixture');
    }

    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('keeps focus outside a closed menu on Escape', () => {
    document.body.innerHTML = `
      <button type="button">Outside</button>
      <details class="site-header-menu">
        <summary>Menu</summary>
      </details>
    `;

    const outside = document.querySelector<HTMLElement>('button');
    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    if (!outside || !menu) {
      throw new Error('Expected closed site header menu fixture');
    }

    outside.focus();
    outside.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('keeps an open menu and focus when Escape comes from outside', () => {
    document.body.innerHTML = `
      <button type="button">Outside</button>
      <details class="site-header-menu" open>
        <summary>Menu</summary>
      </details>
    `;

    const outside = document.querySelector<HTMLElement>('button');
    const menu = document.querySelector<HTMLDetailsElement>(
      'details.site-header-menu',
    );
    if (!outside || !menu) {
      throw new Error('Expected open site header menu fixture');
    }

    outside.focus();
    outside.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(menu.open).toBe(true);
    expect(document.activeElement).toBe(outside);
  });
});
