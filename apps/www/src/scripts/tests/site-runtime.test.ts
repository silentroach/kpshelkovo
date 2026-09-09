import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const highlightSearchTerms = vi.hoisted(() => vi.fn(async () => {}));
const installActiveVisitTracker = vi.hoisted(() => vi.fn());
const { isSearchDialogLoadRetry, loadSearchDialog, openSearchDialog } = vi.hoisted(() => {
  const openSearchDialog = vi.fn();

  return {
    isSearchDialogLoadRetry: vi.fn(() => false),
    loadSearchDialog: vi.fn(async () => ({ openSearchDialog })),
    openSearchDialog
  };
});

vi.mock('@/lib/search/highlight', () => ({
  highlightSearchTerms,
  SEARCH_HIGHLIGHT_PARAM: 'h'
}));
vi.mock('@/scripts/active-visit', () => ({ installActiveVisitTracker }));
vi.mock('@/scripts/search-dialog-loader', () => ({
  isSearchDialogLoadRetry,
  loadSearchDialog
}));

import '../site-runtime';

const renderSearchShell = () => {
  document.body.innerHTML = `
    <button type="button" data-search-trigger>Search</button>
    <div data-search-dialog-root>
      <dialog data-search-dialog>
        <input type="search" data-search-input />
        <button type="button" data-search-close>Close</button>
        <div data-search-load-status hidden>
          <p data-search-load-message></p>
          <button type="button" data-search-retry hidden disabled>Повторить</button>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" data-search-load-announcement></p>
      </dialog>
    </div>
  `;

  const opener = document.querySelector<HTMLElement>('[data-search-trigger]');
  const root = document.querySelector<HTMLElement>('[data-search-dialog-root]');
  const dialog = root?.querySelector<HTMLDialogElement>('[data-search-dialog]');
  const input = root?.querySelector<HTMLInputElement>('[data-search-input]');
  const close = root?.querySelector<HTMLButtonElement>('[data-search-close]');
  const loadStatus = root?.querySelector<HTMLElement>('[data-search-load-status]');
  const loadMessage = root?.querySelector<HTMLElement>('[data-search-load-message]');
  const loadAnnouncement = root?.querySelector<HTMLElement>('[data-search-load-announcement]');
  const retry = root?.querySelector<HTMLButtonElement>('[data-search-retry]');
  if (
    !opener ||
    !root ||
    !dialog ||
    !input ||
    !close ||
    !loadStatus ||
    !loadMessage ||
    !loadAnnouncement ||
    !retry
  ) {
    throw new Error('Expected server-rendered search shell');
  }

  return {
    close,
    dialog,
    input,
    loadAnnouncement,
    loadMessage,
    loadStatus,
    opener,
    retry,
    root
  } as const;
};

beforeEach(() => {
  highlightSearchTerms.mockClear();
  installActiveVisitTracker.mockClear();
  openSearchDialog.mockClear();
  loadSearchDialog.mockReset();
  loadSearchDialog.mockResolvedValue({ openSearchDialog });
  isSearchDialogLoadRetry.mockReset();
  isSearchDialogLoadRetry.mockReturnValue(false);
});

afterEach(() => {
  document.dispatchEvent(new Event('astro:before-swap'));
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  delete document.documentElement.dataset.siteMetrikaId;
  delete window.__shelkovoYmDeferred;
  delete window.__shelkovoYmLoaded;
  delete window.__shelkovoYmTransitions;
  delete window.ym;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Yandex Metrika', () => {
  it('queues goals before the delayed counter load', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.siteMetrikaId = '108975391';
    const append = vi.spyOn(document.head, 'append').mockImplementation(() => {});

    vi.resetModules();
    await import('../site-runtime');
    window.ym?.(108975391, 'reachGoal', 'search_open');

    expect(window.ym?.a).toMatchInlineSnapshot(`
      [
        [
          108975391,
          "reachGoal",
          "search_open",
        ],
      ]
    `);
    expect(append).not.toHaveBeenCalled();
  });

  it('pushes the active visit goal through the instrumented queue', async () => {
    vi.useFakeTimers();
    document.documentElement.dataset.siteMetrikaId = '108975391';
    vi.spyOn(document.head, 'append').mockImplementation(() => {});

    vi.resetModules();
    await import('../site-runtime');
    window.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(1_000);

    const onGoal = installActiveVisitTracker.mock.calls[0]?.[0];
    if (!onGoal) {
      throw new Error('Expected active visit tracker callback');
    }

    const queue = window.ym?.a;
    if (!queue) {
      throw new Error('Expected Yandex Metrika command queue');
    }

    const push = vi.fn();
    Object.defineProperty(queue, 'push', { value: push });
    onGoal();

    expect(push).toHaveBeenCalledWith([108975391, 'reachGoal', '60_sec']);
  });
});

describe('search highlights', () => {
  it('runs after an Astro navigation with the destination query', () => {
    history.replaceState({}, '', '/news/?h=tariff');

    document.dispatchEvent(new Event('astro:page-load'));

    expect(highlightSearchTerms).toHaveBeenCalledOnce();
    expect(highlightSearchTerms).toHaveBeenCalledWith(location.href);
  });
});

describe('home hero fallback', () => {
  it('removes the no-JS image from the incoming Astro document', () => {
    const newDocument = document.implementation.createHTMLDocument();
    const fallback = newDocument.createElement('img');
    fallback.setAttribute('data-home-hero-fallback', '');
    newDocument.body.append(fallback);
    const event = Object.assign(new Event('astro:before-swap'), {
      newDocument
    });

    document.dispatchEvent(event);

    expect(newDocument.querySelectorAll('[data-home-hero-fallback]')).toHaveLength(0);
  });
});

describe('search dialog loader', () => {
  it('opens synchronously and forwards the exact pre-hydration query', async () => {
    const { dialog, input, loadAnnouncement, loadMessage, opener, root } = renderSearchShell();

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    opener.dispatchEvent(click);

    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(click.defaultPrevented).toBe(true);
    expect(loadMessage.textContent).toBe('Загружаем поиск…');
    expect(loadAnnouncement.textContent).toBe('Загружаем поиск…');

    input.value = 'вода';

    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, 'вода');
    expect(input.value).toBe('вода');
  });

  it('shows a failed import and retries with the exact pre-hydration query', async () => {
    const loadError = new Error('chunk unavailable');
    loadSearchDialog.mockRejectedValueOnce(loadError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { dialog, input, loadAnnouncement, loadMessage, loadStatus, opener, retry, root } =
      renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = 'вода';

    await vi.waitFor(() => expect(retry.disabled).toBe(false));
    expect({
      announcement: loadAnnouncement.textContent,
      action: retry.textContent,
      dialogOpen: dialog.open,
      inputFocused: document.activeElement === input,
      inputValue: input.value,
      message: loadMessage.textContent,
      retryDisabled: retry.disabled,
      retryHidden: retry.hidden
    }).toMatchInlineSnapshot(`
      {
        "action": "Повторить",
        "announcement": "Не удалось загрузить поиск",
        "dialogOpen": true,
        "inputFocused": true,
        "inputValue": "вода",
        "message": "Не удалось загрузить поиск",
        "retryDisabled": false,
        "retryHidden": false,
      }
    `);
    expect(openSearchDialog).not.toHaveBeenCalled();

    isSearchDialogLoadRetry.mockReturnValue(true);
    retry.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);
    expect(loadMessage.textContent).toBe('Пробуем загрузить поиск ещё раз…');
    expect(loadAnnouncement.textContent).toBe('Пробуем загрузить поиск ещё раз…');
    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(loadSearchDialog).toHaveBeenCalledTimes(2);
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, 'вода');
    expect(loadStatus.hidden).toBe(true);
    expect(retry.disabled).toBe(true);
    expect(input.value).toBe('вода');
    expect(consoleError).toHaveBeenCalledWith('Не удалось загрузить модуль поиска.', loadError);
  });

  it('keeps repeated failures retryable and announced', async () => {
    loadSearchDialog
      .mockRejectedValueOnce(new Error('initial chunk unavailable'))
      .mockRejectedValueOnce(new Error('retry chunk unavailable'))
      .mockResolvedValueOnce({ openSearchDialog });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { input, loadAnnouncement, loadMessage, loadStatus, opener, retry } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = 'вода';
    await vi.waitFor(() => expect(retry.disabled).toBe(false));

    isSearchDialogLoadRetry.mockReturnValue(true);
    retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => expect(retry.disabled).toBe(false));
    expect({
      announcement: loadAnnouncement.textContent,
      action: retry.textContent,
      inputFocused: document.activeElement === input,
      inputValue: input.value,
      message: loadMessage.textContent,
      statusHidden: loadStatus.hidden
    }).toMatchInlineSnapshot(`
      {
        "action": "Повторить",
        "announcement": "Не удалось загрузить поиск",
        "inputFocused": true,
        "inputValue": "вода",
        "message": "Не удалось загрузить поиск",
        "statusHidden": false,
      }
    `);

    retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(loadAnnouncement.textContent).toBe('Пробуем загрузить поиск ещё раз…');
    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(loadSearchDialog).toHaveBeenCalledTimes(3);
  });

  it('restores the native lifecycle after a failure and opens again', async () => {
    loadSearchDialog.mockRejectedValueOnce(new Error('chunk unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { close, dialog, input, loadStatus, opener, retry, root } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = 'дороги';
    await vi.waitFor(() => expect(retry.disabled).toBe(false));

    close.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(input.value).toBe('');
    expect(loadStatus.hidden).toBe(true);

    isSearchDialogLoadRetry.mockReturnValue(true);
    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, '');
  });

  it('restores the opener when the native shell closes before hydration', () => {
    const { dialog, input, opener } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    dialog.close();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('');
  });

  it('drops a pending hydration on Astro swap without restoring focus', async () => {
    let finishLoad = (): void => {
      throw new Error('Expected pending search dialog load');
    };
    const pendingLoad = new Promise<{
      readonly openSearchDialog: typeof openSearchDialog;
    }>((resolve) => {
      finishLoad = () => resolve({ openSearchDialog });
    });
    loadSearchDialog.mockReturnValueOnce(pendingLoad);
    const { dialog, input, opener } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.activeElement).toBe(input);

    document.dispatchEvent(new Event('astro:before-swap'));
    finishLoad();
    await pendingLoad;
    await Promise.resolve();

    expect(openSearchDialog).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).not.toBe(opener);

    const {
      dialog: nextDialog,
      input: nextInput,
      opener: nextOpener,
      root: nextRoot
    } = renderSearchShell();

    nextOpener.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(nextDialog.open).toBe(true);
    expect(document.activeElement).toBe(nextInput);
    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(openSearchDialog).toHaveBeenCalledWith(nextRoot, nextOpener, '');
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
    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
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

    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
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

    const searchTrigger = document.querySelector<HTMLButtonElement>('[data-search-trigger]');
    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
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

    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
    const summary = menu?.querySelector<HTMLElement>('summary');
    const link = menu?.querySelector<HTMLAnchorElement>('a');
    if (!menu || !summary || !link) {
      throw new Error('Expected site header menu fixture');
    }

    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

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
    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
    if (!outside || !menu) {
      throw new Error('Expected closed site header menu fixture');
    }

    outside.focus();
    outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

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
    const menu = document.querySelector<HTMLDetailsElement>('details.site-header-menu');
    if (!outside || !menu) {
      throw new Error('Expected open site header menu fixture');
    }

    outside.focus();
    outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(menu.open).toBe(true);
    expect(document.activeElement).toBe(outside);
  });
});

describe('desktop site navigation dropdown', () => {
  const renderDropdown = (): {
    readonly dropdown: HTMLElement;
    readonly button: HTMLButtonElement;
    readonly menu: HTMLElement;
    readonly submenuLink: HTMLAnchorElement;
  } => {
    document.body.innerHTML = `
      <div data-site-nav-dropdown>
        <button
          type="button"
          aria-expanded="false"
          data-site-nav-dropdown-button
        >Tariff</button>
        <div data-site-nav-dropdown-menu>
          <a href="/815/compare/">Compare</a>
        </div>
      </div>
      <a href="/map/">Map</a>
    `;
    document.dispatchEvent(new Event('astro:page-load'));

    const dropdown = document.querySelector<HTMLElement>('[data-site-nav-dropdown]');
    const button = dropdown?.querySelector<HTMLButtonElement>('[data-site-nav-dropdown-button]');
    const menu = dropdown?.querySelector<HTMLElement>('[data-site-nav-dropdown-menu]');
    const submenuLink = menu?.querySelector<HTMLAnchorElement>('a');
    if (!dropdown || !button || !menu || !submenuLink) {
      throw new Error('Expected desktop navigation dropdown fixture');
    }

    return { dropdown, button, menu, submenuLink };
  };

  it('hides closed links semantically and restores the trigger on Escape', () => {
    const { button, menu, submenuLink } = renderDropdown();

    expect(menu.hidden).toBe(true);
    button.focus();
    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    submenuLink.focus();
    submenuLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect({
      expanded: button.getAttribute('aria-expanded'),
      focusRestored: document.activeElement === button,
      menuHidden: menu.hidden
    }).toMatchInlineSnapshot(`
      {
        "expanded": "false",
        "focusRestored": true,
        "menuHidden": true,
      }
    `);
  });

  it('toggles after hover and still closes after an outside pointer press', () => {
    const { button, dropdown, menu } = renderDropdown();

    dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    const hiddenStates = [menu.hidden];

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.hidden);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.hidden);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.hidden);

    dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    hiddenStates.push(menu.hidden);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    hiddenStates.push(menu.hidden);

    expect(hiddenStates).toMatchInlineSnapshot(`
      [
        false,
        true,
        false,
        true,
        false,
        true,
      ]
    `);
  });

  it.each(['pen', 'touch'] as const)(
    'keeps a %s click-opened menu open after non-hover pointer leave',
    (pointerType) => {
      const { button, dropdown, menu } = renderDropdown();
      const hiddenStates = [menu.hidden];

      dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 7, pointerType }));
      hiddenStates.push(menu.hidden);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      hiddenStates.push(menu.hidden);
      dropdown.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 7, pointerType }));
      hiddenStates.push(menu.hidden);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      hiddenStates.push(menu.hidden);

      expect({
        buttonFocused: document.activeElement === button,
        hiddenStates
      }).toMatchInlineSnapshot(`
        {
          "buttonFocused": false,
          "hiddenStates": [
            true,
            true,
            false,
            false,
            true,
          ],
        }
      `);
    }
  );
});
