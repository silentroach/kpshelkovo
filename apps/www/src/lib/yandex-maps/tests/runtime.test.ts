import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const exposeYandexMaps = (ready: Promise<void>): void => {
  Object.defineProperty(window, 'ymaps3', {
    value: { ready },
    writable: true,
    configurable: true,
  });
};

beforeEach(() => {
  delete (window as { ymaps3?: unknown }).ymaps3;
});

afterEach(() => {
  document
    .querySelectorAll('[data-yandex-maps-api="true"]')
    .forEach((node) => node.remove());
  delete (window as { ymaps3?: unknown }).ymaps3;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('starts a new script request when Yandex Maps is retried after an error', async () => {
  vi.stubEnv('PUBLIC_YANDEX_MAPS_API_KEY', 'test-key');
  let requests = 0;
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    requests += 1;
    queueMicrotask(() => {
      if (requests === 2) {
        exposeYandexMaps(Promise.resolve());
      }
      node.dispatchEvent(new Event(requests === 1 ? 'error' : 'load'));
    });
    return node;
  });
  const { loadYandexMaps } = await import('../runtime');

  await expect(loadYandexMaps()).rejects.toThrow('Не удалось загрузить карту');
  await expect(loadYandexMaps()).resolves.toBeUndefined();

  expect(requests).toBe(2);
});

it('reloads Yandex Maps when the loaded API rejects its ready promise', async () => {
  vi.stubEnv('PUBLIC_YANDEX_MAPS_API_KEY', 'test-key');
  let requests = 0;
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    requests += 1;
    const ready =
      requests === 1
        ? Promise.reject(new Error('Yandex Maps initialization failed'))
        : Promise.resolve();
    void ready.catch(() => {});
    exposeYandexMaps(ready);
    queueMicrotask(() => node.dispatchEvent(new Event('load')));
    return node;
  });
  const { loadYandexMaps } = await import('../runtime');

  await expect(loadYandexMaps()).rejects.toThrow(
    'Yandex Maps initialization failed',
  );
  await expect(loadYandexMaps()).resolves.toBeUndefined();

  expect(requests).toBe(2);
});

it('shares one script request between concurrent callers on the normal path', async () => {
  vi.stubEnv('PUBLIC_YANDEX_MAPS_API_KEY', 'test-key');
  let requests = 0;
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    requests += 1;
    exposeYandexMaps(Promise.resolve());
    queueMicrotask(() => node.dispatchEvent(new Event('load')));
    return node;
  });
  const { loadYandexMaps } = await import('../runtime');

  await Promise.all([loadYandexMaps(), loadYandexMaps()]);

  expect(requests).toBe(1);
});
