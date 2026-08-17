// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import '../site-runtime';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('site header menu', () => {
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
