// @vitest-environment happy-dom
import type {
  BehaviorMapEventHandler,
  BehaviorStartHandler,
  MapEventResizeHandler,
  MapEventUpdateHandler,
  YMapProps
} from '@yandex/ymaps3-types';
import { afterEach, expect, it, vi } from 'vitest';

import { loadYandexMaps } from '@/lib/yandex-maps/runtime';

import '../editorial-map-element';

vi.mock('@/lib/yandex-maps/runtime', () => ({
  loadYandexMaps: vi.fn(),
  installYandexMapsRuntimeHeadPersistence: vi.fn()
}));

const geometry = {
  type: 'FeatureCollection',
  metadata: { name: 'Тайная подпись' },
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [37, 55] },
      iconCaption: '<b>Проход</b>'
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [38, 56],
          [39, 57]
        ]
      },
      stroke: '#456789'
    }
  ]
};

const location = (
  lng: number,
  lat: number,
  zoom: number
): Parameters<MapEventUpdateHandler>[0]['location'] => ({
  center: [lng, lat],
  zoom,
  bounds: [
    [lng - 1, lat - 1],
    [lng + 1, lat + 1]
  ]
});

const mount = (source: string = JSON.stringify(geometry)): HTMLElement => {
  const figure = document.createElement('figure');
  figure.className = 'ui-editorial-map';
  const map = document.createElement('editorial-map');
  map.setAttribute('data-geometry', source);
  map.setAttribute('data-pagefind-ignore', 'all');
  const caption = document.createElement('figcaption');
  caption.innerHTML =
    '<h3 id="editorial-map-1"><a href="https://example.org/map">Схема прохода</a></h3>';
  figure.append(map, caption);
  document.body.append(figure);
  return map;
};

const setupSdk = () => {
  const instances: Array<{
    readonly canvas: HTMLElement;
    readonly props: YMapProps;
    readonly addChild: ReturnType<typeof vi.fn>;
    readonly update: ReturnType<typeof vi.fn>;
    readonly destroy: ReturnType<typeof vi.fn>;
    readonly setBehaviors: ReturnType<typeof vi.fn>;
    readonly listeners: Array<{
      readonly onActionStart?: BehaviorStartHandler;
      readonly onActionEnd?: BehaviorMapEventHandler;
      readonly onResize?: MapEventResizeHandler;
      readonly onUpdate?: MapEventUpdateHandler;
    }>;
  }> = [];
  const map = vi.fn(function (canvas: HTMLElement, props: YMapProps) {
    const instance = {
      canvas,
      props,
      addChild: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      setBehaviors: vi.fn(),
      listeners: [] as (typeof instances)[number]['listeners']
    };
    instances.push(instance);
    return instance;
  });
  const marker = vi.fn(function (_props: unknown, _element: HTMLElement) {});
  const feature = vi.fn(function (_props: unknown) {});
  const importModule = vi.fn(async (): Promise<{ YMapOpenMapsButton: new () => object }> => ({
    YMapOpenMapsButton: class {}
  }));
  vi.stubGlobal('ymaps3', {
    YMap: map,
    YMapDefaultSchemeLayer: vi.fn(function () {}),
    YMapDefaultFeaturesLayer: vi.fn(function () {}),
    YMapListener: vi.fn(function (props: (typeof instances)[number]['listeners'][number]) {
      instances.at(-1)?.listeners.push(props);
    }),
    YMapMarker: marker,
    YMapFeature: feature,
    YMapControls: vi.fn(function () {}),
    import: importModule
  });
  return { instances, marker, feature, importModule };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.mocked(loadYandexMaps).mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('registers without loading, then starts all below-fold instances eagerly and preserves their static captions', async () => {
  expect(customElements.get('editorial-map')).toBeDefined();
  expect(loadYandexMaps).not.toHaveBeenCalled();
  const sdk = setupSdk();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const first = mount();
  const second = mount();
  expect(loadYandexMaps).toHaveBeenCalledTimes(2);
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(2));
  await vi.waitFor(() =>
    expect(first.querySelector('[role="status"]')?.hasAttribute('hidden')).toBe(true)
  );
  expect(
    sdk.instances.map(({ props, addChild }) => ({
      location: props.location,
      behaviors: props.behaviors,
      children: addChild.mock.calls.length
    }))
  ).toMatchInlineSnapshot(`
    [
      {
        "behaviors": [
          "pinchZoom",
        ],
        "children": 4,
        "location": {
          "bounds": [
            [
              36.4,
              54.4,
            ],
            [
              39.6,
              57.6,
            ],
          ],
          "duration": 0,
        },
      },
      {
        "behaviors": [
          "pinchZoom",
        ],
        "children": 4,
        "location": {
          "bounds": [
            [
              36.4,
              54.4,
            ],
            [
              39.6,
              57.6,
            ],
          ],
          "duration": 0,
        },
      },
    ]
  `);
  expect(sdk.instances[0]?.canvas).not.toBe(sdk.instances[1]?.canvas);
  expect(sdk.instances[0]?.props).toMatchObject({
    copyrightsPosition: 'bottom right',
    distributionPosition: 'top right'
  });
  expect(sdk.marker.mock.calls.map(([, element]) => element.textContent)).toEqual([
    '<b>Проход</b>',
    '<b>Проход</b>'
  ]);
  expect(sdk.feature).toHaveBeenCalledTimes(2);
  expect(first.textContent).not.toContain('Тайная подпись');
  expect(first.getAttribute('aria-label')).toBe('Карта');
  expect(first.parentElement?.querySelector('figcaption a')?.getAttribute('href')).toBe(
    'https://example.org/map'
  );
  expect(second.parentElement?.querySelector('figcaption a')?.textContent).toBe('Схема прохода');
});

it('destroys individual maps on disconnect and recreates on reconnect without leaving gesture handlers', async () => {
  const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
  const sdk = setupSdk();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const first = mount();
  const second = mount();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(2));
  const original = sdk.instances[0]!;
  first.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0 }));
  expect(original.setBehaviors).toHaveBeenLastCalledWith(['drag', 'pinchZoom']);
  window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));
  expect(original.setBehaviors).toHaveBeenLastCalledWith(['pinchZoom']);
  original.listeners[0]?.onActionStart?.({
    type: 'pinchZoom',
    location: location(10, 20, 15),
    camera: {}
  });
  const calls = original.setBehaviors.mock.calls.length;
  first.remove();
  first.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0 }));
  window.dispatchEvent(new PointerEvent('pointerup'));
  expect(original.setBehaviors).toHaveBeenCalledTimes(calls);
  expect(original.destroy).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalled();
  expect(sdk.instances[1]?.destroy).not.toHaveBeenCalled();
  document.body.append(first);
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(3));
  expect(sdk.instances[2]?.canvas).not.toBe(original.canvas);
  sdk.instances[2]?.listeners[0]?.onResize?.({
    type: 'resize',
    size: { x: 500, y: 300 },
    mapInAction: false
  });
  expect(sdk.instances[2]?.update).toHaveBeenCalledWith({
    location: sdk.instances[2]?.props.location,
    margin: [32, 32, 64, 32]
  });
  expect(second.querySelector('[role="status"]')?.hasAttribute('hidden')).toBe(true);
});

it('labels the native attribution as it appears and stops observing the canvas', async () => {
  const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
  const sdk = setupSdk();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  mount();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(1));
  const logo = document.createElement('a');
  logo.className = 'ymaps3--map-copyrights__logo';
  sdk.instances[0]!.canvas.append(logo);
  await vi.waitFor(() => expect(logo.getAttribute('aria-label')).toBe('Яндекс Карты'));
  expect(disconnect).toHaveBeenCalled();
});

it('ignores both SDK and native control results after disconnect', async () => {
  const sdk = setupSdk();
  const sdkReady = Promise.withResolvers<void>();
  vi.mocked(loadYandexMaps).mockReturnValueOnce(sdkReady.promise);
  const removed = mount();
  removed.remove();
  sdkReady.resolve();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(0));
  const controlReady = Promise.withResolvers<{ YMapOpenMapsButton: new () => object }>();
  sdk.importModule.mockReturnValueOnce(controlReady.promise);
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const loadingControl = mount();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(1));
  loadingControl.remove();
  const instance = sdk.instances[0]!;
  const added = instance.addChild.mock.calls.length;
  controlReady.resolve({ YMapOpenMapsButton: class {} });
  await vi.waitFor(() => expect(instance.destroy).toHaveBeenCalledOnce());
  await Promise.resolve();
  expect(instance.addChild).toHaveBeenCalledTimes(added);
});

it('shows a generic accessible error without exposing data, retrying or changing the caption', async () => {
  const sdk = setupSdk();
  const malformed = mount('{"features":[{"description":"SECRET_PRIVATE"}]}');
  await vi.waitFor(() =>
    expect(malformed.querySelector('[role="status"]')?.textContent).toBe('Карта не загрузилась.')
  );
  expect(loadYandexMaps).not.toHaveBeenCalled();
  expect(sdk.instances).toHaveLength(0);
  expect(malformed.textContent).not.toContain('SECRET_PRIVATE');
  vi.mocked(loadYandexMaps).mockRejectedValueOnce(new Error('SECRET_PRIVATE'));
  const loading = mount();
  await vi.waitFor(() =>
    expect(loading.querySelector('[role="status"]')?.textContent).toBe('Карта не загрузилась.')
  );
  expect(loading.querySelector('button')).toBeFalsy();
  expect(loading.parentElement?.querySelector('figcaption a')?.textContent).toBe('Схема прохода');
  expect(loadYandexMaps).toHaveBeenCalledOnce();
});

it('destroys a partial map if the native controls fail and never retries on resize', async () => {
  const sdk = setupSdk();
  sdk.importModule.mockRejectedValueOnce(new Error('PRIVATE_NATIVE_CONTROL_ERROR'));
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount();
  await vi.waitFor(() =>
    expect(element.querySelector('[role="status"]')?.textContent).toBe('Карта не загрузилась.')
  );
  const instance = sdk.instances[0]!;
  expect(instance.destroy).toHaveBeenCalledOnce();
  instance.listeners[0]?.onResize?.({
    type: 'resize',
    size: { x: 100, y: 200 },
    mapInAction: false
  });
  expect(instance.update).not.toHaveBeenCalled();
  expect(element.textContent).not.toContain('PRIVATE_NATIVE_CONTROL_ERROR');
  expect(loadYandexMaps).toHaveBeenCalledOnce();
});

it('preserves ordinary scrolling, enables deliberate pinch and releases mouse drag outside the map', async () => {
  const sdk = setupSdk();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(1));
  const instance = sdk.instances[0]!;
  for (const ctrlKey of [false, true, false]) {
    const wheel = new MouseEvent('wheel', { ctrlKey, bubbles: true, cancelable: true });
    element.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
  }
  expect(instance.setBehaviors.mock.calls.map(([value]) => value)).toEqual([
    ['pinchZoom'],
    ['pinchZoom', 'scrollZoom'],
    ['pinchZoom']
  ]);
  element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0 }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));
  element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1 }));
  element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 2 }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', pointerId: 1 }));
  expect(instance.setBehaviors.mock.calls.slice(-5).map(([value]) => value)).toEqual([
    ['drag', 'pinchZoom'],
    ['pinchZoom'],
    ['pinchZoom'],
    ['drag', 'pinchZoom'],
    ['pinchZoom']
  ]);
});

it('refits on resize and print resize until a SDK action, then preserves the final center and zoom', async () => {
  const sdk = setupSdk();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount();
  await vi.waitFor(() => expect(sdk.instances).toHaveLength(1));
  const { listeners, update, props } = sdk.instances[0]!;
  const handler = listeners[0]!;
  const resize = (x: number, y: number): void =>
    handler.onResize?.({ type: 'resize', size: { x, y }, mapInAction: false });
  resize(0, 300);
  expect(update).not.toHaveBeenCalled();
  handler.onUpdate?.({
    type: 'update',
    location: location(10, 20, 15),
    camera: {},
    mapInAction: false
  });
  resize(700, 300);
  resize(400, 500);
  expect(update.mock.calls.map(([value]) => value.location)).toEqual([
    props.location,
    props.location
  ]);
  expect(update.mock.calls[0]?.[0].location).not.toBe(props.location);
  expect(update.mock.calls[1]?.[0].location).not.toBe(update.mock.calls[0]?.[0].location);
  if (!('bounds' in props.location)) throw new Error('Expected initial bounds');
  expect(update.mock.calls[0]?.[0].location.bounds).not.toBe(props.location.bounds);
  expect(update.mock.calls[1]?.[0].location.bounds).not.toBe(
    update.mock.calls[0]?.[0].location.bounds
  );
  handler.onActionStart?.({ type: 'pinchZoom', location: location(10, 20, 15), camera: {} });
  handler.onUpdate?.({
    type: 'update',
    location: location(11, 21, 17),
    camera: {},
    mapInAction: true
  });
  handler.onActionEnd?.({ type: 'pinchZoom', location: location(12, 22, 18), camera: {} });
  resize(900, 250);
  resize(250, 900);
  expect(update.mock.calls.slice(-2).map(([value]) => value.location)).toEqual([
    { center: [12, 22], zoom: 18, duration: 0 },
    { center: [12, 22], zoom: 18, duration: 0 }
  ]);
  // A programmatic update is not a new manual action, even after resizing.
  handler.onUpdate?.({
    type: 'update',
    location: location(0, 0, 3),
    camera: {},
    mapInAction: false
  });
  resize(500, 400);
  expect(update).toHaveBeenLastCalledWith({
    location: { center: [12, 22], zoom: 18, duration: 0 },
    margin: [32, 32, 64, 32]
  });
  element.remove();
  resize(800, 300);
  expect(update).toHaveBeenCalledTimes(5);
});
