const API_KEY = import.meta.env.PUBLIC_YANDEX_MAPS_API_KEY || '';
const MAP_SCRIPT_SELECTOR = 'script[data-yandex-maps-api="true"]';
const MAP_SCRIPT_TIMEOUT_MS = 15_000;

let mapsLoadPromise: Promise<void> | undefined;
let runtimeHeadPersistenceInstalled = false;

type AstroBeforeSwapEvent = Event & {
  readonly newDocument?: Document;
};

const isYandexMapsHeadUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    const host = new URL(url).hostname;

    return (
      host === 'api-maps.yandex.ru' ||
      host.endsWith('.api-maps.yandex.ru') ||
      host === 'yastatic.net'
    );
  } catch {
    return false;
  }
};

const yandexHeadKey = (node: Element): string | undefined => {
  // Astro executes script clones added to the next document, so preserve only inert assets.
  if (node instanceof HTMLLinkElement && isYandexMapsHeadUrl(node.href)) {
    return `link:${node.rel}:${node.href}`;
  }

  if (node instanceof HTMLStyleElement) {
    const text = node.textContent ?? '';

    if (text.toLowerCase().includes('ymaps')) {
      return `style:${text.slice(0, 512)}`;
    }
  }

  return;
};

const preserveYandexRuntimeHead = (event: Event): void => {
  const next = (event as AstroBeforeSwapEvent).newDocument;

  if (!next) return;

  const existing = new Set(
    [...next.head.children]
      .map((node) => yandexHeadKey(node))
      .filter((key): key is string => key !== undefined),
  );

  for (const node of document.head.children) {
    const key = yandexHeadKey(node);

    if (!key || existing.has(key)) continue;

    next.head.appendChild(node.cloneNode(true));
    existing.add(key);
  }
};

export const installYandexMapsRuntimeHeadPersistence = (): void => {
  if (runtimeHeadPersistenceInstalled) return;

  runtimeHeadPersistenceInstalled = true;
  document.addEventListener('astro:before-swap', preserveYandexRuntimeHead);
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window.requestAnimationFrame !== 'function') {
      window.setTimeout(resolve, 0);
      return;
    }

    window.requestAnimationFrame(() => {
      resolve();
    });
  });

export const waitForStableLayout = async (): Promise<void> => {
  await nextFrame();
  await wait(50);
  await nextFrame();
};

const getExistingMapsScript = (): HTMLScriptElement | undefined =>
  document.querySelector<HTMLScriptElement>(MAP_SCRIPT_SELECTOR) ?? undefined;

const resetYandexMapsRuntime = (): void => {
  mapsLoadPromise = undefined;
  getExistingMapsScript()?.remove();
  Reflect.set(window, 'ymaps3', undefined);
  Reflect.deleteProperty(window, 'ymaps3');
};

const appendMapsScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = getExistingMapsScript();

    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    let timer: number | undefined;

    const cleanup = (): void => {
      if (timer !== undefined) window.clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const onLoad = (): void => {
      cleanup();
      script.dataset.loaded = 'true';
      resolve();
    };

    const onError = (): void => {
      cleanup();
      script.remove();
      reject(new Error('Не удалось загрузить карту'));
    };

    timer = window.setTimeout(onError, MAP_SCRIPT_TIMEOUT_MS);

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) {
      script.dataset.yandexMapsApi = 'true';
      script.src = `https://api-maps.yandex.ru/v3/?apikey=${API_KEY}&lang=ru_RU&csp=202512`;
      script.async = true;
      document.head.appendChild(script);
    }
  });

export const loadYandexMaps = async (): Promise<void> => {
  await waitForStableLayout();

  if (!window.ymaps3) {
    if (!API_KEY) throw new Error('API ключ не настроен');

    mapsLoadPromise ??= appendMapsScript().catch((error) => {
      resetYandexMapsRuntime();
      throw error;
    });
    await mapsLoadPromise;
  }

  const maps = window.ymaps3;
  if (!maps) {
    resetYandexMapsRuntime();
    throw new Error('Yandex Maps API не доступен');
  }

  try {
    await maps.ready;
  } catch (error) {
    resetYandexMapsRuntime();
    throw error;
  }
};
