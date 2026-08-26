import { installHomeStatusHydration } from '@/lib/home/status';
import { highlightSearchTerms } from '@/lib/search/highlight';
import { installStatusServiceStateHydration } from '@/lib/status/lifecycle.dom';

interface AstroBeforePreparationEvent extends Event {
  loader: () => Promise<void>;
}

type YandexMetrika = ((...args: readonly unknown[]) => void) & {
  a?: readonly (readonly unknown[])[];
  l?: number;
};

declare global {
  interface Window {
    __shelkovoNavigationProgress?: boolean;
    __shelkovoSearchDialogLoader?: boolean;
    __shelkovoSiteHeaderMenu?: boolean;
    __shelkovoSiteNavDropdowns?: boolean;
    __shelkovoSettlementsFallback?: boolean;
    __shelkovoSearchHighlights?: boolean;
    __shelkovoYmDeferred?: boolean;
    __shelkovoYmLoaded?: boolean;
    __shelkovoYmTransitions?: boolean;
    ym?: YandexMetrika;
  }
}

const METRIKA_SCRIPT_SRC = 'https://mc.yandex.ru/metrika/tag.js';
const METRIKA_WEBVISOR_ENABLED = true;
const NAVIGATION_PENDING_ATTR = 'data-site-navigation-pending';
const NAVIGATION_DELAY_MS = 50;
const SEARCH_DIALOG_HYDRATED_ATTR = 'data-search-dialog-hydrated';
const SEARCH_DIALOG_ROOT_SELECTOR = '[data-search-dialog-root]';
const SEARCH_DIALOG_SELECTOR = '[data-search-dialog]';
const SEARCH_INPUT_SELECTOR = '[data-search-input]';
const SEARCH_CLOSE_SELECTOR = '[data-search-close]';
const SEARCH_TRIGGER_SELECTOR = '[data-search-trigger]';
const SITE_HEADER_MENU_SELECTOR = 'details.site-header-menu[open]';
const SITE_NAV_DROPDOWN_SELECTOR = '[data-site-nav-dropdown]';
const SITE_NAV_DROPDOWN_BUTTON_SELECTOR = '[data-site-nav-dropdown-button]';

const runWhenDocumentReady = (callback: () => void): void => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
};

const isAstroBeforePreparationEvent = (
  event: Event,
): event is AstroBeforePreparationEvent => {
  const value = event as Partial<AstroBeforePreparationEvent>;

  return typeof value.loader === 'function';
};

const metrikaId = (): number | undefined => {
  const value = document.documentElement.dataset.siteMetrikaId;
  const parsed = value ? Number(value) : undefined;

  return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
};

const installMetrikaStub = (): YandexMetrika => {
  if (typeof window.ym === 'function') {
    return window.ym;
  }

  const ym: YandexMetrika = (...args) => {
    ym.a = [...(ym.a ?? []), args];
  };

  ym.l = Date.now();
  window.ym = ym;

  return ym;
};

const loadMetrika = (id: number, webvisorEnabled: boolean): void => {
  if (window.__shelkovoYmLoaded) {
    return;
  }

  window.__shelkovoYmLoaded = true;
  const ym = installMetrikaStub();
  const scriptSrc = `${METRIKA_SCRIPT_SRC}?id=${id}`;
  const hasScript = Array.from(document.scripts).some(
    (script) => script.src === scriptSrc,
  );

  if (!hasScript) {
    const script = document.createElement('script');

    script.async = true;
    script.src = scriptSrc;
    document.head.append(script);
  }

  ym(id, 'init', {
    accurateTrackBounce: true,
    clickmap: webvisorEnabled,
    referrer: document.referrer,
    ssr: true,
    trackLinks: true,
    url: location.href,
    webvisor: webvisorEnabled,
  });
};

const bindMetrikaLoader = (): void => {
  const id = metrikaId();

  if (id === undefined || window.__shelkovoYmDeferred) {
    return;
  }

  window.__shelkovoYmDeferred = true;
  const scheduleAfterLoad = (): void => {
    window.setTimeout(() => loadMetrika(id, METRIKA_WEBVISOR_ENABLED), 1000);
  };

  if (document.readyState === 'complete') {
    scheduleAfterLoad();
    return;
  }

  window.addEventListener('load', scheduleAfterLoad, { once: true });
};

const bindMetrikaTransitions = (): void => {
  const id = metrikaId();

  if (id === undefined || window.__shelkovoYmTransitions) {
    return;
  }

  window.__shelkovoYmTransitions = true;
  let href = location.href;

  document.addEventListener('astro:page-load', () => {
    if (location.href === href) {
      return;
    }

    href = location.href;
    window.ym?.(id, 'hit', href);
  });
};

const bindNavigationProgress = (): void => {
  if (window.__shelkovoNavigationProgress) {
    return;
  }

  window.__shelkovoNavigationProgress = true;
  const root = document.documentElement;
  const show = (): void => {
    root.setAttribute(NAVIGATION_PENDING_ATTR, '');
    document.body?.setAttribute('aria-busy', 'true');
  };
  const hide = (): void => {
    root.removeAttribute(NAVIGATION_PENDING_ATTR);
    document.body?.removeAttribute('aria-busy');
  };

  document.addEventListener('astro:before-preparation', (event) => {
    if (!isAstroBeforePreparationEvent(event)) {
      return;
    }

    const loader = event.loader;
    let timer: number | undefined;

    event.loader = async () => {
      timer = window.setTimeout(show, NAVIGATION_DELAY_MS);

      try {
        await loader();
      } finally {
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }

        hide();
      }
    };
  });
  document.addEventListener('astro:page-load', hide);
  window.addEventListener('pageshow', hide);
};

const bindSiteNavDropdown = (dropdown: HTMLElement): void => {
  if (dropdown.dataset.siteNavDropdownHydrated) {
    return;
  }

  const button = dropdown.querySelector(SITE_NAV_DROPDOWN_BUTTON_SELECTOR);
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  dropdown.dataset.siteNavDropdownHydrated = 'true';
  const controller = new AbortController();
  const { signal } = controller;

  const setOpen = (isOpen: boolean): void => {
    dropdown.toggleAttribute('data-open', isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
  };

  button.addEventListener(
    'click',
    () => setOpen(!dropdown.hasAttribute('data-open')),
    { signal },
  );

  dropdown.addEventListener(
    'focusout',
    (event) => {
      if (
        event.relatedTarget instanceof Node &&
        dropdown.contains(event.relatedTarget)
      ) {
        return;
      }

      setOpen(false);
    },
    { signal },
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!dropdown.hasAttribute('data-open')) {
        return;
      }

      if (event.target instanceof Node && dropdown.contains(event.target)) {
        return;
      }

      setOpen(false);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !dropdown.hasAttribute('data-open')) {
        return;
      }

      setOpen(false);
      button.focus();
    },
    { signal },
  );

  document.addEventListener('astro:before-swap', () => controller.abort(), {
    once: true,
    signal,
  });
};

const bindSiteNavDropdowns = (): void => {
  document.querySelectorAll(SITE_NAV_DROPDOWN_SELECTOR).forEach((dropdown) => {
    if (dropdown instanceof HTMLElement) {
      bindSiteNavDropdown(dropdown);
    }
  });
};

const installSiteNavDropdowns = (): void => {
  const bind = (): void => bindSiteNavDropdowns();

  if (window.__shelkovoSiteNavDropdowns) {
    bind();
    return;
  }

  window.__shelkovoSiteNavDropdowns = true;
  runWhenDocumentReady(bind);
  document.addEventListener('astro:after-swap', bind);
  document.addEventListener('astro:page-load', bind);
};

const bindSiteHeaderMenu = (): void => {
  if (window.__shelkovoSiteHeaderMenu) {
    return;
  }

  window.__shelkovoSiteHeaderMenu = true;
  document.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    document
      .querySelectorAll<HTMLDetailsElement>(SITE_HEADER_MENU_SELECTOR)
      .forEach((menu) => {
        if (!menu.contains(target)) {
          menu.open = false;
        }
      });
  });

  document.addEventListener('click', (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(SEARCH_TRIGGER_SELECTOR)
    ) {
      return;
    }

    document
      .querySelectorAll<HTMLDetailsElement>(SITE_HEADER_MENU_SELECTOR)
      .forEach((menu) => {
        menu.open = false;
      });
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Escape') {
      return;
    }

    const menu = document.querySelector<HTMLDetailsElement>(
      SITE_HEADER_MENU_SELECTOR,
    );
    if (!menu?.open) {
      return;
    }

    const eventTargetIsInsideMenu =
      event.target instanceof Node && menu.contains(event.target);
    const focusIsInsideMenu = menu.contains(document.activeElement);
    if (!eventTargetIsInsideMenu && !focusIsInsideMenu) {
      return;
    }

    menu.open = false;
    menu.querySelector<HTMLElement>(':scope > summary')?.focus();
  });
};

let latestSearchDialogRequest = 0;
let nativeSearchDialogOpener: HTMLElement | undefined;

const requestSearchDialog = async (
  root: HTMLElement,
  opener: HTMLElement,
  requestId: number,
): Promise<void> => {
  const { openSearchDialog } = await import('@/components/search/lazy');
  const dialog = root.querySelector<HTMLDialogElement>(SEARCH_DIALOG_SELECTOR);
  const input = root.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
  if (
    requestId !== latestSearchDialogRequest ||
    !root.isConnected ||
    !dialog?.open ||
    !input
  ) {
    return;
  }

  openSearchDialog(root, opener, input.value);
  nativeSearchDialogOpener = undefined;
};

const closeNativeSearchDialog = (target: Element): void => {
  const closeButton = target.closest(SEARCH_CLOSE_SELECTOR);
  const dialog =
    target instanceof HTMLDialogElement &&
    target.matches(SEARCH_DIALOG_SELECTOR)
      ? target
      : closeButton?.closest<HTMLDialogElement>(SEARCH_DIALOG_SELECTOR);
  const root = dialog?.closest<HTMLElement>(SEARCH_DIALOG_ROOT_SELECTOR);
  if (
    !dialog?.open ||
    !root ||
    root.hasAttribute(SEARCH_DIALOG_HYDRATED_ATTR)
  ) {
    return;
  }

  dialog.close();
};

const finishNativeSearchDialogClose = (dialog: HTMLDialogElement): void => {
  const root = dialog.closest<HTMLElement>(SEARCH_DIALOG_ROOT_SELECTOR);
  if (!root || root.hasAttribute(SEARCH_DIALOG_HYDRATED_ATTR)) {
    return;
  }

  latestSearchDialogRequest += 1;
  const opener = nativeSearchDialogOpener;
  nativeSearchDialogOpener = undefined;
  const input = dialog.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
  if (input) {
    input.value = '';
  }
  if (opener?.isConnected) {
    opener.focus();
  }
};

const bindSearchDialogLoader = (): void => {
  if (window.__shelkovoSearchDialogLoader) {
    return;
  }

  window.__shelkovoSearchDialogLoader = true;
  document.addEventListener('astro:before-swap', () => {
    latestSearchDialogRequest += 1;
    nativeSearchDialogOpener = undefined;
    const root = document.querySelector<HTMLElement>(
      SEARCH_DIALOG_ROOT_SELECTOR,
    );
    if (!root || root.hasAttribute(SEARCH_DIALOG_HYDRATED_ATTR)) {
      return;
    }

    const dialog = root.querySelector<HTMLDialogElement>(
      SEARCH_DIALOG_SELECTOR,
    );
    if (dialog?.open) {
      dialog.close();
    }
  });
  document.addEventListener(
    'close',
    (event) => {
      if (event.target instanceof HTMLDialogElement) {
        finishNativeSearchDialogClose(event.target);
      }
    },
    true,
  );
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const trigger = event.target.closest(SEARCH_TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLElement)) {
      closeNativeSearchDialog(event.target);
      return;
    }

    const root = document.querySelector<HTMLElement>(
      SEARCH_DIALOG_ROOT_SELECTOR,
    );
    const dialog = root?.querySelector<HTMLDialogElement>(
      SEARCH_DIALOG_SELECTOR,
    );
    const input = root?.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
    if (!root || !dialog || !input) {
      return;
    }

    event.preventDefault();
    input.value = '';
    if (!root.hasAttribute(SEARCH_DIALOG_HYDRATED_ATTR)) {
      nativeSearchDialogOpener = trigger;
    }
    if (!dialog.open) {
      dialog.showModal();
    }
    input.focus();

    const requestId = ++latestSearchDialogRequest;
    void requestSearchDialog(root, trigger, requestId).catch(() => {});
  });
};

const bindSettlementsFallback = (): void => {
  if (window.__shelkovoSettlementsFallback) {
    return;
  }

  window.__shelkovoSettlementsFallback = true;
  window.addEventListener('explorer:ready', () => {
    document
      .getElementById('settlements-static')
      ?.style.setProperty('display', 'none');
  });
};

const installSearchHighlights = (): void => {
  if (window.__shelkovoSearchHighlights) {
    return;
  }

  window.__shelkovoSearchHighlights = true;
  let highlightedHref: string | undefined;
  const highlight = (): void => {
    const href = location.href;
    if (highlightedHref === href) {
      return;
    }

    highlightedHref = href;
    void highlightSearchTerms(href).catch(() => {
      if (highlightedHref === href) {
        highlightedHref = undefined;
      }
    });
  };

  runWhenDocumentReady(highlight);
  document.addEventListener('astro:page-load', highlight);
};

bindNavigationProgress();
bindSiteHeaderMenu();
bindSearchDialogLoader();
installSiteNavDropdowns();
runWhenDocumentReady(() => installHomeStatusHydration());
runWhenDocumentReady(() => installStatusServiceStateHydration());
bindMetrikaLoader();
bindMetrikaTransitions();
bindSettlementsFallback();
installSearchHighlights();

export {};
