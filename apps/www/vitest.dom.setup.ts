import { cleanup } from '@testing-library/svelte';
import { afterEach, beforeAll, beforeEach } from 'vitest';

const createYmapsMock = (): unknown => ({
  ready: Promise.resolve(),
  YMap: class {
    addChild(): void {}
    removeChild(): void {}
    update(): void {}
    destroy(): void {}
  },
  YMapDefaultSchemeLayer: class {},
  YMapDefaultFeaturesLayer: class {},
  YMapMarker: class {
    update(): void {}
  }
});

const ensureYmapsMock = (): void => {
  Object.defineProperty(window, 'ymaps3', {
    value: createYmapsMock(),
    writable: true,
    configurable: true
  });
};

beforeAll(() => {
  const appendChild = HTMLHeadElement.prototype.appendChild;

  HTMLHeadElement.prototype.appendChild = function appendChildForTests<T extends Node>(node: T): T {
    if (node instanceof HTMLScriptElement && node.src.includes('api-maps.yandex.ru')) {
      ensureYmapsMock();
      window.setTimeout(() => {
        node.dataset.loaded = 'true';
        node.dispatchEvent(new Event('load'));
      }, 0);
      return node;
    }

    return appendChild.call(this, node) as T;
  };
});

beforeEach(() => {
  ensureYmapsMock();
});

afterEach(() => {
  cleanup();
  delete (window as { ymaps3?: unknown }).ymaps3;
});
