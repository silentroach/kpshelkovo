import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const highlightSearchTerms = vi.hoisted(() => vi.fn(async () => {}));
const installActiveVisitTracker = vi.hoisted(() => vi.fn());
const { loadSearchDialog, openSearchDialog } = vi.hoisted(() => {
  const openSearchDialog = vi.fn();

  return {
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
  if (
    !opener ||
    !root ||
    !dialog ||
    !input ||
    !close ||
    !loadStatus ||
    !loadMessage ||
    !loadAnnouncement
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
    root
  } as const;
};

beforeEach(() => {
  highlightSearchTerms.mockClear();
  installActiveVisitTracker.mockClear();
  openSearchDialog.mockReset();
  loadSearchDialog.mockReset();
  loadSearchDialog.mockResolvedValue({ openSearchDialog });
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
    vi.useFakeTimers();
    const { dialog, input, loadAnnouncement, loadMessage, loadStatus, opener, root } =
      renderSearchShell();

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    opener.dispatchEvent(click);

    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(click.defaultPrevented).toBe(true);
    expect(loadSearchDialog).toHaveBeenCalledOnce();
    expect(loadStatus.hidden).toBe(true);
    expect(loadMessage.textContent).toBe('');
    expect(loadAnnouncement.textContent).toBe('');

    input.value = 'вода';

    await vi.advanceTimersByTimeAsync(0);
    expect(openSearchDialog).toHaveBeenCalledOnce();
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, 'вода');
    expect(input.value).toBe('вода');
    await vi.advanceTimersByTimeAsync(200);
    expect(loadStatus.hidden).toBe(true);
    expect(loadAnnouncement.textContent).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows and announces loading at 200 ms, then removes it immediately on readiness', async () => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof loadSearchDialog>>>();
    loadSearchDialog.mockReturnValueOnce(pending.promise);
    const { input, loadAnnouncement, loadMessage, loadStatus, opener, root } = renderSearchShell();

    opener.click();
    input.value = '  вода  ';
    await vi.advanceTimersByTimeAsync(199);
    expect(loadStatus.hidden).toBe(true);
    expect(loadMessage.textContent).toBe('');
    expect(loadAnnouncement.textContent).toBe('');

    await vi.advanceTimersByTimeAsync(1);
    expect(loadStatus.hidden).toBe(false);
    expect(loadMessage.textContent).toBe('Загружаем поиск…');
    expect(loadAnnouncement.textContent).toBe(loadMessage.textContent);
    expect(document.activeElement).toBe(input);

    pending.resolve({ openSearchDialog });
    await vi.advanceTimersByTimeAsync(0);
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, '  вода  ');
    expect(input.value).toBe('  вода  ');
    expect(loadStatus.hidden).toBe(true);
    expect(loadMessage.textContent).toBe('');
    expect(loadAnnouncement.textContent).toBe('');
  });

  it.each([100, 250])(
    'shows failure immediately after %i ms without a later loading announcement',
    async (delay) => {
      vi.useFakeTimers();
      const pending = Promise.withResolvers<Awaited<ReturnType<typeof loadSearchDialog>>>();
      loadSearchDialog.mockReturnValueOnce(pending.promise);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { input, loadAnnouncement, loadMessage, loadStatus, opener } = renderSearchShell();

      opener.click();
      input.value = 'вода';
      await vi.advanceTimersByTimeAsync(delay);
      pending.reject(new Error('chunk unavailable'));
      await vi.advanceTimersByTimeAsync(0);

      expect(loadStatus.hidden).toBe(false);
      expect(loadMessage.textContent).toContain('обновить страницу');
      expect(loadAnnouncement.textContent).toBe(loadMessage.textContent);
      expect(input.value).toBe('вода');
      expect(document.activeElement).toBe(input);
      const message = loadMessage.textContent;
      await vi.advanceTimersByTimeAsync(200);
      expect(loadMessage.textContent).toBe(message);
      expect(loadAnnouncement.textContent).toBe(message);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.each([
    ['close', 100],
    ['close', 250],
    ['swap', 100],
    ['swap', 250]
  ] as const)('cancels the indicator on %s after %i ms', async (action, delay) => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof loadSearchDialog>>>();
    loadSearchDialog.mockReturnValueOnce(pending.promise);
    const { close, dialog, loadAnnouncement, loadMessage, loadStatus, opener } =
      renderSearchShell();

    opener.click();
    await vi.advanceTimersByTimeAsync(delay);
    if (action === 'close') {
      close.click();
      expect(document.activeElement).toBe(opener);
    } else {
      document.dispatchEvent(new Event('astro:before-swap'));
      expect(document.activeElement).not.toBe(opener);
    }
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    pending.resolve({ openSearchDialog });
    await vi.advanceTimersByTimeAsync(0);

    expect(dialog.open).toBe(false);
    expect(openSearchDialog).not.toHaveBeenCalled();
    expect(loadStatus.hidden).toBe(true);
    expect(loadMessage.textContent).toBe('');
    expect(loadAnnouncement.textContent).toBe('');
  });

  it.each([
    ['resolve', 100],
    ['resolve', 200],
    ['reject', 100],
    ['reject', 200]
  ] as const)('ignores old %s after %i ms of a reopened request', async (completion, delay) => {
    vi.useFakeTimers();
    const previous = Promise.withResolvers<Awaited<ReturnType<typeof loadSearchDialog>>>();
    const current = Promise.withResolvers<Awaited<ReturnType<typeof loadSearchDialog>>>();
    loadSearchDialog.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const { dialog, input, loadAnnouncement, loadMessage, loadStatus, opener, root } =
      renderSearchShell();

    opener.click();
    await vi.advanceTimersByTimeAsync(100);
    dialog.close();
    opener.click();
    input.value = 'дороги';
    await vi.advanceTimersByTimeAsync(100);
    expect(loadStatus.hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(delay - 100);

    if (completion === 'resolve') {
      previous.resolve({ openSearchDialog });
    } else {
      previous.reject(new Error('old chunk unavailable'));
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(openSearchDialog).not.toHaveBeenCalled();
    expect(loadStatus.hidden).toBe(delay < 200);
    expect(loadAnnouncement.textContent).toBe(loadMessage.textContent);
    await vi.advanceTimersByTimeAsync(200 - delay);
    expect(loadStatus.hidden).toBe(false);
    expect(loadMessage.textContent).toBe('Загружаем поиск…');
    expect(loadAnnouncement.textContent).toBe(loadMessage.textContent);

    current.resolve({ openSearchDialog });
    await vi.advanceTimersByTimeAsync(0);
    expect(openSearchDialog).toHaveBeenCalledExactlyOnceWith(root, opener, 'дороги');
    expect(loadStatus.hidden).toBe(true);
    expect(loadAnnouncement.textContent).toBe('');
  });

  it('reopens a hydrated interface without scheduling a loading indicator', async () => {
    vi.useFakeTimers();
    const { dialog, input, loadAnnouncement, loadStatus, opener, root } = renderSearchShell();
    openSearchDialog.mockImplementation(() => root.setAttribute('data-search-dialog-hydrated', ''));

    opener.click();
    await vi.advanceTimersByTimeAsync(0);
    dialog.close();
    opener.click();
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(openSearchDialog).toHaveBeenCalledTimes(2);
    expect(loadStatus.hidden).toBe(true);
    expect(loadAnnouncement.textContent).toBe('');
  });

  it('announces a failed import without a recovery button or automatic reload', async () => {
    const loadError = new Error('chunk unavailable');
    loadSearchDialog.mockRejectedValueOnce(loadError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    const { dialog, input, loadAnnouncement, loadMessage, opener, root } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = 'вода';

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect({
      announcement: loadAnnouncement.textContent,
      dialogOpen: dialog.open,
      inputFocused: document.activeElement === input,
      inputValue: input.value,
      message: loadMessage.textContent,
      recoveryButtons: root.querySelectorAll('[data-search-load-status] button').length
    }).toMatchInlineSnapshot(`
      {
        "announcement": "Поиск не загрузился. Попробуйте обновить страницу",
        "dialogOpen": true,
        "inputFocused": true,
        "inputValue": "вода",
        "message": "Поиск не загрузился. Попробуйте обновить страницу",
        "recoveryButtons": 0,
      }
    `);
    expect(openSearchDialog).not.toHaveBeenCalled();

    expect(reload).not.toHaveBeenCalled();
    expect(loadSearchDialog).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('Не удалось загрузить модуль поиска.', loadError);
  });

  it('restores the native lifecycle after a failure and opens again', async () => {
    loadSearchDialog.mockRejectedValueOnce(new Error('chunk unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { close, dialog, input, loadStatus, loadMessage, opener, root } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.value = 'дороги';
    await vi.waitFor(() => expect(loadMessage.textContent).toContain('обновить страницу'));

    close.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(input.value).toBe('');
    expect(loadStatus.hidden).toBe(true);

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(input);
    await vi.waitFor(() => expect(openSearchDialog).toHaveBeenCalledOnce());
    expect(openSearchDialog).toHaveBeenCalledWith(root, opener, '');
  });

  it('restores the opener and ignores completion after closing before hydration', async () => {
    const { dialog, input, opener } = renderSearchShell();

    opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    dialog.close();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);

    await Promise.resolve();
    await Promise.resolve();
    expect(openSearchDialog).not.toHaveBeenCalled();

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
  it('restores focus when CSS has hidden its responsive header area before blur', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    document.body.innerHTML = `
      <a href="/" class="site-header-brand">Brand</a>
      <div class="site-header-mobile-actions"><button type="button">Menu</button></div>
    `;
    const brand = document.querySelector<HTMLElement>('.site-header-brand');
    const navigation = document.querySelector<HTMLElement>('.site-header-mobile-actions');
    const trigger = navigation?.querySelector<HTMLButtonElement>('button');
    if (!brand || !navigation || !trigger) throw new Error('Expected responsive header');
    trigger.focus();
    navigation.style.display = 'none';
    trigger.blur();
    expect(document.activeElement).toBe(brand);
  });

  it('does not redirect normal focus loss from a visible header area', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    document.body.innerHTML = `
      <a href="/" class="site-header-brand">Brand</a>
      <div class="site-header-mobile-actions"><button type="button">Menu</button></div>
      <button type="button" data-outside>Outside</button>
    `;
    const trigger = document.querySelector<HTMLButtonElement>('.site-header-mobile-actions button');
    const outside = document.querySelector<HTMLButtonElement>('[data-outside]');
    if (!trigger || !outside) throw new Error('Expected focus targets');
    trigger.focus();
    outside.focus();
    expect(document.activeElement).toBe(outside);
  });
  it('updates input availability synchronously on rapid summary toggles and link selection', () => {
    document.body.innerHTML = `
      <details class="site-header-menu">
        <summary>Menu</summary>
        <div class="site-header-mobile-panel"><a href="/news/">News</a></div>
      </details>
    `;
    document.dispatchEvent(new Event('astro:page-load'));
    const menu = document.querySelector<HTMLDetailsElement>('details');
    const summary = menu?.querySelector<HTMLElement>('summary');
    const panel = menu?.querySelector<HTMLElement>('.site-header-mobile-panel');
    const link = panel?.querySelector<HTMLAnchorElement>('a');
    if (!menu || !summary || !panel || !link) throw new Error('Expected mobile menu');
    const states = [panel.inert];
    // happy-dom toggles summary before MouseEvent bubbles; test our handler without that default.
    summary.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    states.push(panel.inert);
    summary.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    states.push(panel.inert);
    summary.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    states.push(panel.inert);
    link.focus();
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    states.push(panel.inert);
    expect({ states, open: menu.open, focusRestored: document.activeElement === summary })
      .toMatchInlineSnapshot(`
      {
        "focusRestored": true,
        "open": false,
        "states": [
          true,
          false,
          true,
          false,
          true,
        ],
      }
    `);
  });
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

    expect(menu.inert).toBe(true);
    button.focus();
    button.click();
    expect(menu.inert).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    submenuLink.focus();
    submenuLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect({
      expanded: button.getAttribute('aria-expanded'),
      focusRestored: document.activeElement === button,
      menuInert: menu.inert
    }).toMatchInlineSnapshot(`
      {
        "expanded": "false",
        "focusRestored": true,
        "menuInert": true,
      }
    `);
  });

  it('toggles after hover and still closes after an outside pointer press', () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const result = matchMedia(query);
      if (query === '(hover: hover) and (pointer: fine)') {
        Object.defineProperty(result, 'matches', { value: true });
      }
      return result;
    });
    const { button, dropdown, menu } = renderDropdown();

    dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    const hiddenStates = [menu.inert];

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.inert);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.inert);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    hiddenStates.push(menu.inert);

    dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    hiddenStates.push(menu.inert);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    hiddenStates.push(menu.inert);

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
      const hiddenStates = [menu.inert];

      dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerId: 7, pointerType }));
      hiddenStates.push(menu.inert);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      hiddenStates.push(menu.inert);
      dropdown.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 7, pointerType }));
      hiddenStates.push(menu.inert);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      hiddenStates.push(menu.inert);

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

  it('resets an open desktop menu and moves focus to the brand when its layout disappears', () => {
    const matchMedia = window.matchMedia.bind(window);
    const layout = matchMedia('(min-width: 56rem)');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query === '(min-width: 56rem)' ? layout : matchMedia(query)
    );
    const { button, dropdown, menu, submenuLink } = renderDropdown();
    const brand = document.createElement('a');
    brand.href = '/';
    brand.className = 'site-header-brand';
    document.body.prepend(brand);
    button.click();
    submenuLink.focus();
    layout.dispatchEvent(new Event('change'));
    expect({
      open: dropdown.hasAttribute('data-open'),
      inert: menu.inert,
      focusVisible: document.activeElement === brand
    }).toMatchInlineSnapshot(`
      {
        "focusVisible": true,
        "inert": true,
        "open": false,
      }
    `);
  });

  it('does not open from synthetic mouse hover on a non-hover device', () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const result = matchMedia(query);
      if (query === '(hover: hover) and (pointer: fine)') {
        Object.defineProperty(result, 'matches', { value: false });
      }
      return result;
    });
    const { dropdown, menu } = renderDropdown();
    dropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    expect(menu.inert).toBe(true);
  });
});
