// @vitest-environment happy-dom
import type { MapEvents, YMapMarkerProps } from '@yandex/ymaps3-types';
import { afterEach, expect, it, vi } from 'vitest';

import { loadYandexMaps } from '@/lib/yandex-maps/runtime';

import { getPreviewLocation, PlacePreviewElement } from '../place-preview';
import type { PlacePreviewData } from '../place-preview.types';

vi.mock('@/lib/yandex-maps/runtime', () => ({
  loadYandexMaps: vi.fn(),
  installYandexMapsRuntimeHeadPersistence: vi.fn()
}));

customElements.define('test-place-preview', PlacePreviewElement);

const mount = (openingHours?: PlacePreviewData['openingHours']): HTMLElement => {
  const element = document.createElement('test-place-preview');
  element.dataset.preview = JSON.stringify({ coordinates: { lng: 37, lat: 55 }, openingHours });
  element.innerHTML =
    '<div data-canvas inert></div><div data-fallback><p data-message></p><a href="https://yandex.ru/maps/?original">Map</a></div><template><span></span></template>';
  document.body.append(element);
  return element;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(loadYandexMaps).mockReset();
});

it('fits the point and all separate polygons, including a distant point', () => {
  expect(
    getPreviewLocation({
      coordinates: { lng: 10, lat: 20 },
      geometry: {
        area: {
          precision: 'approximate',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [11, 21],
                  [12, 21],
                  [11, 22],
                  [11, 21]
                ]
              ],
              [
                [
                  [14, 24],
                  [15, 24],
                  [14, 25],
                  [14, 24]
                ]
              ]
            ]
          }
        }
      }
    })
  ).toMatchInlineSnapshot(`
    {
      "bounds": [
        [
          8.5,
          18.5,
        ],
        [
          16.5,
          26.5,
        ],
      ],
      "duration": 0,
    }
  `);
  expect(getPreviewLocation({ coordinates: { lng: 37, lat: 55 } })).toMatchInlineSnapshot(`
    {
      "center": [
        37,
        55,
      ],
      "duration": 0,
      "zoom": 16.5,
    }
  `);
});

it('ignores a stale async failure after reconnect and preserves the original fallback', async () => {
  const first = Promise.withResolvers<void>();
  const second = Promise.withResolvers<void>();
  vi.mocked(loadYandexMaps).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const element = mount();
  element.remove();
  document.body.append(element);
  first.reject(new Error('stale'));
  await first.promise.catch(() => {});
  expect(log).not.toHaveBeenCalled();
  second.reject(new Error('current'));
  await second.promise.catch(() => {});
  expect(log).toHaveBeenCalledOnce();
  expect(element.querySelector<HTMLElement>('[data-fallback]')?.hidden).toBe(false);
  expect(element.querySelector('a')?.getAttribute('href')).toBe('https://yandex.ru/maps/?original');
});

it.each(['tiles first', 'action first'])(
  'waits for both rendering and the native action, with %s, and cleans up on reconnect',
  async (order) => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-17T06:59:00Z'));
    const ready = Promise.withResolvers<void>();
    vi.mocked(loadYandexMaps).mockReturnValue(ready.promise);
    const destroy = vi.fn();
    const update = vi.fn();
    const entity = vi.fn(function () {});
    const create = vi.fn(function () {
      return { addChild: vi.fn(), destroy, update };
    });
    const marker = vi.fn(function (_props: YMapMarkerProps, _content: HTMLElement) {});
    const listener = vi.fn(function (_props: Pick<MapEvents, 'onResize' | 'onStateChanged'>) {});
    vi.stubGlobal('ymaps3', {
      YMap: create,
      YMapDefaultSchemeLayer: Object.assign(entity, { defaultProps: { source: 'scheme' } }),
      YMapDefaultFeaturesLayer: entity,
      YMapMarker: marker,
      YMapListener: listener
    });
    const scheduled = order === 'tiles first';
    const element = mount(
      scheduled
        ? {
            periods: [
              { days: ['thu'], opensAt: '10:00', closesAt: '13:00' },
              { days: ['thu'], opensAt: '14:00', closesAt: '19:00' }
            ]
          }
        : undefined
    );
    element.remove();
    document.body.append(element);
    const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
    expect(canvas.inert).toBe(true);
    ready.resolve();
    await ready.promise;
    expect(create).toHaveBeenCalledOnce();
    const content = marker.mock.calls[0]![1];
    expect(content.dataset.open).toBe(scheduled ? 'false' : undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(content.dataset.open).toBe(scheduled ? 'true' : undefined);
    vi.setSystemTime(new Date('2026-09-17T09:59:00Z'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(content.dataset.open).toBe(scheduled ? 'false' : undefined);
    vi.setSystemTime(new Date('2026-09-17T10:59:00Z'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(content.dataset.open).toBe(scheduled ? 'true' : undefined);
    const fallback = element.querySelector<HTMLElement>('[data-fallback]');
    expect(fallback?.hidden).toBe(false);
    const stateChanged = listener.mock.calls[0]?.[0].onStateChanged;
    const publishTiles = (tilesReady: number, tilesTotal = 2): void =>
      stateChanged?.({
        getLayerState: () => ({ tilesReady, tilesTotal, tilesLoaded: tilesReady })
      });
    stateChanged?.({ getLayerState: () => undefined });
    publishTiles(0, 0);
    expect(fallback?.hidden).toBe(false);
    const button = document.createElement('button');
    button.innerHTML = '<span class="ymaps3--open-maps-button">Open Maps</span>';
    const focus = vi.spyOn(button, 'focus');
    const outside = document.createElement('button');
    document.body.append(outside);
    if (order === 'tiles first') element.querySelector('a')?.focus();
    else outside.focus();
    if (order === 'tiles first') {
      publishTiles(2);
      expect(fallback?.hidden).toBe(false);
      button.disabled = true;
      element.querySelector('[data-canvas]')?.append(button);
      await Promise.resolve();
      expect(fallback?.hidden).toBe(false);
      button.disabled = false;
    } else {
      element.querySelector('[data-canvas]')?.append(button);
      publishTiles(1);
      await Promise.resolve();
      expect(fallback?.hidden).toBe(false);
      expect(canvas.inert).toBe(true);
      publishTiles(2);
    }
    await vi.waitFor(() => expect(fallback?.hidden).toBe(true));
    expect(canvas.inert).toBe(false);
    expect(document.activeElement).toBe(order === 'tiles first' ? button : outside);
    if (order === 'tiles first') expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    else expect(focus).not.toHaveBeenCalled();
    // Attribution can arrive after the native action and tile renderer.
    const logo = document.createElement('a');
    logo.className = 'ymaps3--map-copyrights__logo';
    logo.href = 'https://yandex.ru/maps/';
    element.querySelector('[data-canvas]')?.append(logo);
    await vi.waitFor(() => expect(logo.getAttribute('aria-label')).toBe('Яндекс Карты'));
    const resize = listener.mock.calls[0]?.[0].onResize;
    resize?.({ type: 'resize', size: { x: 320, y: 240 }, mapInAction: false });
    expect(update).toHaveBeenCalledOnce();
    element.remove();
    expect(canvas.inert).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(destroy).toHaveBeenCalledOnce();
    resize?.({ type: 'resize', size: { x: 390, y: 240 }, mapInAction: false });
    expect(update).toHaveBeenCalledOnce();
    expect(element.querySelector<HTMLElement>('[data-fallback]')?.hidden).toBe(false);
    document.body.append(element);
    await ready.promise;
    publishTiles(2);
    expect(fallback?.hidden).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
    expect(marker).toHaveBeenCalledTimes(2);
    expect(marker.mock.calls[0]?.[1]).not.toBe(marker.mock.calls[1]?.[1]);
    expect(vi.getTimerCount()).toBe(scheduled ? 1 : 0);
  }
);
