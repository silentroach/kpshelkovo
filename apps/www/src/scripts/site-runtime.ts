import { installHomeStatusHydration } from '@/lib/home/status';

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
    __shelkovoSiteNavDropdowns?: boolean;
    __shelkovoSettlementsFallback?: boolean;
    __shelkovoYmDeferred?: boolean;
    __shelkovoYmLoaded?: boolean;
    __shelkovoYmTransitions?: boolean;
    ym?: YandexMetrika;
  }
}

const METRIKA_SCRIPT_SRC = 'https://mc.yandex.ru/metrika/tag.js';
const NAVIGATION_PENDING_ATTR = 'data-site-navigation-pending';
const NAVIGATION_DELAY_MS = 50;
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

const loadMetrika = (id: number): void => {
  if (window.__shelkovoYmLoaded) {
    return;
  }

  window.__shelkovoYmLoaded = true;
  const ym = installMetrikaStub();
  const hasScript = Array.from(document.scripts).some(
    (script) => script.src === METRIKA_SCRIPT_SRC,
  );

  if (!hasScript) {
    const script = document.createElement('script');

    script.async = true;
    script.src = METRIKA_SCRIPT_SRC;
    document.head.append(script);
  }

  ym(id, 'init', {
    accurateTrackBounce: true,
    clickmap: false,
    trackLinks: true,
    webvisor: false,
  });
};

const bindMetrikaLoader = (): void => {
  const id = metrikaId();

  if (id === undefined || window.__shelkovoYmDeferred) {
    return;
  }

  window.__shelkovoYmDeferred = true;
  const scheduleAfterLoad = (): void => {
    window.setTimeout(() => loadMetrika(id), 1000);
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

bindNavigationProgress();
installSiteNavDropdowns();
runWhenDocumentReady(() => installHomeStatusHydration());
bindMetrikaLoader();
bindMetrikaTransitions();
bindSettlementsFallback();

export {};
