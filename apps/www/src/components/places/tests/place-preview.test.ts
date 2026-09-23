// @vitest-environment happy-dom
import type {
  MapEvents,
  YMapControlsProps,
  YMapDefaultSchemeLayerProps,
  YMapFeatureProps,
  YMapMarkerProps,
  YMapProps
} from '@yandex/ymaps3-types';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  getPreviewLocation,
  getPreviewMargin,
  MapPreviewElement
} from '@/components/maps/map-preview';
import type { MapPreviewData } from '@/components/maps/map-preview.types';
import { installYandexMapsRuntimeHeadPersistence, loadYandexMaps } from '@/lib/yandex-maps/runtime';

vi.mock('@/lib/yandex-maps/runtime', () => ({
  loadYandexMaps: vi.fn(),
  installYandexMapsRuntimeHeadPersistence: vi.fn()
}));

customElements.define('test-map-preview', MapPreviewElement);

const intersections = new Map<
  Element,
  (entries: readonly Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>[]) => void
>();
const resizes = new Map<Element, () => void>();
const stopIntersection = vi.fn();
const stopResize = vi.fn();
const intersectionObserver = vi.fn(function (
  callback: (
    entries: readonly Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>[]
  ) => void,
  _options: IntersectionObserverInit
) {
  return {
    observe: (element: Element) => intersections.set(element, callback),
    disconnect: stopIntersection
  };
});

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', intersectionObserver);
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(function (callback: () => void) {
      return {
        observe: (element: Element) => resizes.set(element, callback),
        disconnect: stopResize
      };
    })
  );
});

const approach = (element: HTMLElement, isIntersecting = true): void =>
  intersections.get(element)?.([{ target: element, isIntersecting }]);

const setSize = (element: HTMLElement, width: number, height: number): void => {
  for (const target of [element, element.querySelector('[data-canvas]')!]) {
    Object.defineProperties(target, {
      clientWidth: { configurable: true, value: width },
      clientHeight: { configurable: true, value: height }
    });
  }
  resizes.get(element)?.();
};

const mount = (
  data: MapPreviewData = { coordinates: { lng: 37, lat: 55 } },
  fallback = true
): HTMLElement => {
  const element = document.createElement('test-map-preview');
  element.dataset.preview = JSON.stringify(data);
  element.innerHTML =
    '<div data-canvas inert></div><div data-fallback><p data-message></p><a href="https://yandex.ru/maps/?original">Map</a></div><template><a href="https://yandex.ru/maps/?original" target="_blank" rel="noopener noreferrer" title="Место на карте" aria-label="Место на карте"><img src="/marker.png" alt="" /></a></template>';
  if (!fallback) element.querySelector('[data-fallback]')?.remove();
  setSize(element, 640, 240);
  document.body.append(element);
  return element;
};

const setupMaps = () => {
  const destroy = vi.fn();
  const update = vi.fn();
  const setBehaviors = vi.fn();
  const create = vi.fn(function (_canvas: HTMLElement, _props: YMapProps) {
    return { addChild: vi.fn(), destroy, update, setBehaviors };
  });
  const marker = vi.fn(function (_props: YMapMarkerProps, _content: HTMLElement) {});
  const feature = vi.fn(function (_props: YMapFeatureProps) {});
  const listener = vi.fn(function (_props: Pick<MapEvents, 'onResize' | 'onStateChanged'>) {});
  const scheme = vi.fn(function (_props: YMapDefaultSchemeLayerProps) {});
  const controls = vi.fn(function (_props: YMapControlsProps, _children: readonly unknown[]) {});
  const openButton = vi.fn(function (_props: { readonly title: string }) {});
  const extras = { YMapOpenMapsButton: openButton };
  const importModule = vi.fn(async (_module: string) => extras);
  vi.stubGlobal('ymaps3', {
    import: importModule,
    YMapControls: controls,
    YMap: create,
    YMapDefaultSchemeLayer: Object.assign(scheme, { defaultProps: { source: 'scheme' } }),
    YMapDefaultFeaturesLayer: vi.fn(function () {}),
    YMapFeature: feature,
    YMapMarker: marker,
    YMapListener: listener
  });
  return {
    create,
    marker,
    feature,
    listener,
    destroy,
    update,
    setBehaviors,
    controls,
    importModule,
    extras
  };
};

afterEach(() => {
  document.body.replaceChildren();
  intersections.clear();
  resizes.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(loadYandexMaps).mockReset();
});

it('starts previews independently near the viewport, once per connection, and installs head persistence eagerly', async () => {
  const { create, destroy } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const first = mount();
  const second = mount();
  expect(installYandexMapsRuntimeHeadPersistence).toHaveBeenCalledTimes(2);
  expect(loadYandexMaps).not.toHaveBeenCalled();
  expect(intersectionObserver.mock.calls.map(([, options]) => options.rootMargin)).toEqual([
    '200px',
    '200px'
  ]);
  approach(first, false);
  expect(loadYandexMaps).not.toHaveBeenCalled();
  approach(second);
  await Promise.resolve();
  expect(create.mock.calls.map(([canvas]) => canvas.parentElement)).toEqual([second]);
  approach(second, false);
  approach(second);
  expect(loadYandexMaps).toHaveBeenCalledOnce();
  expect(destroy).not.toHaveBeenCalled();
  approach(first);
  await Promise.resolve();
  expect(create.mock.calls.map(([canvas]) => canvas.parentElement)).toEqual([second, first]);
  expect(stopIntersection).toHaveBeenCalledTimes(2);
  expect(stopResize).toHaveBeenCalledTimes(2);
});

it('waits for a hidden zero-sized preview to have both dimensions, even if already intersecting', async () => {
  const { create } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount();
  setSize(element, 0, 0);
  approach(element);
  setSize(element, 640, 0);
  expect(loadYandexMaps).not.toHaveBeenCalled();
  setSize(element, 640, 240);
  await Promise.resolve();
  expect(create).toHaveBeenCalledOnce();
  setSize(element, 0, 0);
  setSize(element, 640, 240);
  expect(create).toHaveBeenCalledOnce();
});

it('does not start a removed preview or finish SDK initialization after disconnection', async () => {
  const { create } = setupMaps();
  const ready = Promise.withResolvers<void>();
  vi.mocked(loadYandexMaps).mockReturnValue(ready.promise);
  const unseen = mount();
  unseen.remove();
  approach(unseen);
  expect(loadYandexMaps).not.toHaveBeenCalled();
  const loading = mount();
  approach(loading);
  loading.remove();
  ready.resolve();
  await ready.promise;
  expect(create).not.toHaveBeenCalled();
  expect(stopIntersection).toHaveBeenCalledTimes(2);
  expect(stopResize).toHaveBeenCalledTimes(2);
});

it('renders and refits the point and all separate polygons, including a distant point', async () => {
  const data: MapPreviewData = {
    coordinates: { lng: 10, lat: 20 },
    geometry: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [16, 26] },
          iconCaption: '<b>Схема</b>',
          markerColor: '#ff6600'
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [12, 21],
              [13, 22]
            ]
          },
          stroke: '#123456',
          strokeWidth: 3,
          strokeDasharray: [4, 2]
        },
        {
          type: 'Feature',
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
          },
          fill: '#abc123',
          fillOpacity: 0.2
        }
      ]
    }
  };
  const { create, feature, marker, listener, update } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount(data);
  approach(element);
  await Promise.resolve();
  expect(feature.mock.calls.map(([props]) => props.geometry.type)).toEqual([
    'LineString',
    'MultiPolygon'
  ]);
  expect(feature.mock.calls.map(([props]) => props.style)).toMatchObject([
    { stroke: [{ color: '#123456', width: 3, dash: [4, 2] }] },
    { fill: '#abc123', fillOpacity: 0.2 }
  ]);
  expect(marker).toHaveBeenCalledTimes(2);
  expect(marker.mock.calls[0]?.[1].textContent).toBe('<b>Схема</b>');
  expect(marker.mock.calls[0]?.[1].querySelector('b')).toBeFalsy();
  expect(marker.mock.calls[1]?.[1].getAttribute('href')).toBe('https://yandex.ru/maps/?original');
  expect(create.mock.calls[0]?.[1].location).toMatchInlineSnapshot(`
    {
      "bounds": [
        [
          8.2,
          18.2,
        ],
        [
          17.8,
          27.8,
        ],
      ],
      "duration": 0,
    }
  `);
  listener.mock.calls[0]?.[0].onResize?.({
    type: 'resize',
    size: { x: 320, y: 240 },
    mapInAction: true
  });
  expect(update).toHaveBeenCalledWith({
    location: create.mock.calls[0]?.[1].location,
    margin: [32, 32, 64, 32]
  });
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

it.each([
  { zoom: 16, anchor: [0.75, 0.2] as const },
  { zoom: 15, anchor: [0.75, 0.5] as const }
])(
  'frames a background with zoom $zoom and keeps native actions usable without tiles',
  async (framing) => {
    const { create, marker, listener, update } = setupMaps();
    vi.mocked(loadYandexMaps).mockResolvedValue();
    const element = mount(
      {
        coordinates: { lng: 37, lat: 55 },
        zoom: framing.zoom,
        anchor: framing.anchor,
        muted: true
      },
      false
    );
    approach(element);
    await Promise.resolve();
    const props = create.mock.calls[0]?.[1];
    expect(props?.location).toEqual({ center: [37, 55], zoom: framing.zoom, duration: 0 });
    expect(props?.margin).toEqual([0, 0, framing.zoom === 16 ? 144 : 0, 320]);
    expect({
      behaviors: props?.behaviors,
      copyrightsPosition: props?.copyrightsPosition,
      distributionPosition: props?.distributionPosition
    }).toMatchInlineSnapshot(`
      {
        "behaviors": [],
        "copyrightsPosition": "bottom left",
        "distributionPosition": "top right",
      }
    `);
    expect(marker.mock.calls[0]?.[0].coordinates).toEqual([37, 55]);
    const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
    const button = document.createElement('button');
    button.innerHTML = '<span class="ymaps3--open-maps-button">Яндекс Карты</span>';
    const logo = document.createElement('a');
    logo.className = 'ymaps3--map-copyrights__logo';
    canvas.append(button, logo);
    listener.mock.calls[0]?.[0].onStateChanged?.({ getLayerState: () => undefined });
    expect(canvas.inert).toBe(false);
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(element.querySelector('[data-fallback]')).toBeFalsy();
    await vi.waitFor(() => expect(logo.getAttribute('aria-label')).toBe('Яндекс Карты'));
    const resize = listener.mock.calls[0]?.[0].onResize;
    resize?.({ type: 'resize', size: { x: 0, y: 0 }, mapInAction: false });
    expect(update).not.toHaveBeenCalled();
    resize?.({ type: 'resize', size: { x: 320, y: 480 }, mapInAction: false });
    expect(update).toHaveBeenCalledWith({
      location: { center: [37, 55], zoom: framing.zoom, duration: 0 },
      margin: [0, 0, framing.zoom === 16 ? 288 : 0, 160]
    });
  }
);

it('gates native wheel zoom to trackpad pinch before the SDK and cleans up on reconnect', async () => {
  const { create, setBehaviors } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount({ coordinates: { lng: 37, lat: 55 }, interactive: true });
  approach(element);
  await Promise.resolve();
  expect(create.mock.calls[0]?.[1].behaviors).toEqual(['pinchZoom']);

  const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
  const behaviorsAtCanvas: unknown[] = [];
  canvas.addEventListener('wheel', () => behaviorsAtCanvas.push(setBehaviors.mock.lastCall?.[0]));
  for (const ctrlKey of [false, true, false]) {
    // happy-dom's WheelEvent drops mouse modifiers; this handler only reads ctrlKey.
    const event = new MouseEvent('wheel', {
      ctrlKey,
      bubbles: true,
      cancelable: true
    });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(behaviorsAtCanvas).toMatchInlineSnapshot(`
    [
      [
        "pinchZoom",
      ],
      [
        "pinchZoom",
        "scrollZoom",
      ],
      [
        "pinchZoom",
      ],
    ]
  `);

  element.remove();
  canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
  canvas.dispatchEvent(new MouseEvent('wheel', { ctrlKey: true, bubbles: true }));
  expect(setBehaviors).toHaveBeenCalledTimes(3);
  document.body.append(element);
  approach(element);
  await Promise.resolve();
  canvas.dispatchEvent(new MouseEvent('wheel', { ctrlKey: true, bubbles: true }));
  expect(setBehaviors).toHaveBeenCalledTimes(4);
});

it('enables native dragging for the primary mouse button and preserves the input mode through wheel', async () => {
  const { setBehaviors } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount({ coordinates: { lng: 37, lat: 55 }, interactive: true });
  approach(element);
  await Promise.resolve();
  const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
  for (const [pointerType, button, behaviors] of [
    ['mouse', 0, ['drag', 'pinchZoom']],
    ['touch', 0, ['pinchZoom']],
    ['mouse', 2, ['pinchZoom']],
    ['mouse', 0, ['drag', 'pinchZoom']]
  ] as const) {
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerType, button, bubbles: true }));
    expect(setBehaviors).toHaveBeenLastCalledWith(behaviors);
    canvas.dispatchEvent(new MouseEvent('wheel', { ctrlKey: true, bubbles: true }));
    expect(setBehaviors).toHaveBeenLastCalledWith([...behaviors, 'scrollZoom']);
    canvas.dispatchEvent(new MouseEvent('wheel', { bubbles: true }));
    expect(setBehaviors).toHaveBeenLastCalledWith(behaviors);
  }
});

it('leaves ordinary and pinch wheel events to the browser on a fixed background', async () => {
  const { setBehaviors } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount();
  approach(element);
  await Promise.resolve();
  element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
  for (const ctrlKey of [false, true]) {
    const event = new MouseEvent('wheel', { ctrlKey, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(setBehaviors).not.toHaveBeenCalled();
});

it.each([true, false])(
  'preserves the native menu only for a root marker link (link: %s)',
  async (link) => {
    const { marker } = setupMaps();
    vi.mocked(loadYandexMaps).mockResolvedValue();
    const element = mount({ coordinates: { lng: 37, lat: 55 } }, false);
    if (!link) element.querySelector('template')!.innerHTML = '<span><img alt="" /></span>';
    approach(element);
    await Promise.resolve();
    const content = marker.mock.calls[0]![1];
    const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
    const sdkMenu = vi.fn((event: Event) => event.preventDefault());
    canvas.addEventListener('contextmenu', sdkMenu);
    canvas.append(content);

    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    content.querySelector('img')!.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(!link);
    expect(sdkMenu).toHaveBeenCalledTimes(link ? 0 : 1);

    sdkMenu.mockClear();
    const backgroundMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(backgroundMenu);
    expect(sdkMenu).toHaveBeenCalledOnce();
    expect(backgroundMenu.defaultPrevented).toBe(true);

    const sdkPointer = vi.fn();
    canvas.addEventListener('pointerdown', sdkPointer);
    const pointer = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    content.dispatchEvent(pointer);
    expect(sdkPointer).toHaveBeenCalledOnce();
    expect(pointer.defaultPrevented).toBe(false);
  }
);

it('positions the canonical center with margins on either side of the container', () => {
  for (const anchor of [
    [0.75, 0.2],
    [0.75, 0.5],
    [0.25, 0.8],
    [0.5, 0.5]
  ] as const) {
    const [top, right, bottom, left] = getPreviewMargin(600, 400, anchor);
    expect([(600 + left - right) / 2, (400 + top - bottom) / 2]).toEqual([
      600 * anchor[0],
      400 * anchor[1]
    ]);
  }
});

it('passes the event copyright position to the SDK', async () => {
  const { create } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  const element = mount({ coordinates: { lng: 37, lat: 55 }, copyrightsPosition: 'bottom right' });
  approach(element);
  await Promise.resolve();
  expect(create.mock.calls[0]?.[1].copyrightsPosition).toBe('bottom right');
});

it.each(['top right', 'bottom right'] as const)(
  'installs the compact native control at %s before handing off from the fallback',
  async (position) => {
    const { create, controls, importModule, extras, listener } = setupMaps();
    const imported = Promise.withResolvers<typeof extras>();
    importModule.mockReturnValueOnce(imported.promise);
    vi.mocked(loadYandexMaps).mockResolvedValue();
    const element = mount({ coordinates: { lng: 37, lat: 55 }, distributionPosition: position });
    approach(element);
    await Promise.resolve();

    const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
    const fallback = element.querySelector<HTMLElement>('[data-fallback]')!;
    const fallbackLink = fallback.querySelector('a')!;
    fallbackLink.focus();
    const automatic = document.createElement('button');
    automatic.innerHTML = '<span class="ymaps3--open-maps-button">Открыть Яндекс Карты</span>';
    canvas.append(automatic);
    listener.mock.calls[0]?.[0].onStateChanged?.({
      getLayerState: () => ({ tilesReady: 1, tilesTotal: 1, tilesLoaded: 1 })
    });
    expect(fallback.hidden).toBe(false);
    expect(controls).not.toHaveBeenCalled();

    imported.resolve(extras);
    await vi.waitFor(() => expect(controls).toHaveBeenCalledOnce());
    expect(controls.mock.calls[0]?.[0]).toEqual({ position });
    expect(create.mock.results[0]?.value.addChild).toHaveBeenCalledWith(controls.mock.instances[0]);
    expect(fallback.hidden).toBe(false);
    expect(document.activeElement).toBe(fallbackLink);

    const compact = document.createElement('button');
    compact.innerHTML = '<span class="ymaps3--open-maps-button">Яндекс Карты</span>';
    compact.disabled = true;
    canvas.append(compact);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(fallback.hidden).toBe(false);
    compact.disabled = false;
    await vi.waitFor(() => expect(document.activeElement).toBe(compact));
    expect(fallback.hidden).toBe(true);
    expect(fallbackLink.href).toBe('https://yandex.ru/maps/?original');
  }
);

it('restores the original fallback after control import failure and retries on reconnect', async () => {
  const { controls, importModule, destroy } = setupMaps();
  importModule.mockRejectedValueOnce(new Error('Control unavailable'));
  vi.mocked(loadYandexMaps).mockResolvedValue();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const element = mount();
  approach(element);
  await vi.waitFor(() => expect(destroy).toHaveBeenCalledOnce());
  const fallback = element.querySelector<HTMLElement>('[data-fallback]')!;
  expect({
    hidden: fallback.hidden,
    href: fallback.querySelector('a')?.getAttribute('href'),
    inert: element.querySelector<HTMLElement>('[data-canvas]')?.inert
  }).toMatchInlineSnapshot(`
    {
      "hidden": false,
      "href": "https://yandex.ru/maps/?original",
      "inert": true,
    }
  `);
  expect(controls).not.toHaveBeenCalled();
  element.remove();
  document.body.append(element);
  approach(element);
  await vi.waitFor(() => expect(controls).toHaveBeenCalledOnce());
  expect(importModule).toHaveBeenCalledTimes(2);
});

it.each(['resolve', 'reject'] as const)(
  'ignores a stale control import %s after reconnect',
  async (outcome) => {
    const { create, controls, importModule, extras, destroy } = setupMaps();
    const imported = Promise.withResolvers<typeof extras>();
    importModule.mockReturnValueOnce(imported.promise);
    vi.mocked(loadYandexMaps).mockResolvedValue();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const element = mount();
    approach(element);
    await vi.waitFor(() => expect(importModule).toHaveBeenCalledOnce());
    const oldMap = create.mock.results[0]!.value;
    element.remove();
    expect(destroy).toHaveBeenCalledOnce();
    oldMap.addChild.mockClear();
    document.body.append(element);
    approach(element);
    await vi.waitFor(() => expect(controls).toHaveBeenCalledOnce());
    const currentMap = create.mock.results[1]!.value;
    const currentChildren = currentMap.addChild.mock.calls.length;

    if (outcome === 'resolve') imported.resolve(extras);
    else imported.reject(new Error('Stale control'));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(oldMap.addChild).not.toHaveBeenCalled();
    expect(currentMap.addChild).toHaveBeenCalledTimes(currentChildren);
    expect(destroy).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
  }
);

it('ignores a stale async failure after reconnect and preserves the original fallback', async () => {
  const first = Promise.withResolvers<void>();
  const second = Promise.withResolvers<void>();
  vi.mocked(loadYandexMaps).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const element = mount();
  approach(element);
  element.remove();
  document.body.append(element);
  approach(element);
  first.reject(new Error('stale'));
  await first.promise.catch(() => {});
  expect(log).not.toHaveBeenCalled();
  second.reject(new Error('current'));
  await second.promise.catch(() => {});
  expect(log).toHaveBeenCalledOnce();
  expect(element.querySelector<HTMLElement>('[data-fallback]')?.hidden).toBe(false);
  expect(element.querySelector('a')?.getAttribute('href')).toBe('https://yandex.ru/maps/?original');
  approach(element);
  expect(loadYandexMaps).toHaveBeenCalledTimes(2);
  const { create } = setupMaps();
  vi.mocked(loadYandexMaps).mockResolvedValue();
  element.remove();
  document.body.append(element);
  expect(create).not.toHaveBeenCalled();
  approach(element);
  await Promise.resolve();
  expect(create).toHaveBeenCalledOnce();
});

it.each(['tiles first', 'action first'])(
  'waits for both rendering and the native action, with %s, and cleans up on reconnect',
  async (order) => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-17T06:59:00Z'));
    const ready = Promise.withResolvers<void>();
    vi.mocked(loadYandexMaps).mockReturnValue(ready.promise);
    const { destroy, update, create, marker, listener } = setupMaps();
    const scheduled = order === 'tiles first';
    const element = mount({
      coordinates: { lng: 37, lat: 55 },
      openingHours: scheduled
        ? {
            periods: [
              { days: ['thu'], opensAt: '10:00', closesAt: '13:00' },
              { days: ['thu'], opensAt: '14:00', closesAt: '19:00' }
            ]
          }
        : undefined
    });
    approach(element);
    element.remove();
    document.body.append(element);
    approach(element);
    const canvas = element.querySelector<HTMLElement>('[data-canvas]')!;
    expect(canvas.inert).toBe(true);
    ready.resolve();
    await ready.promise;
    expect(create).toHaveBeenCalledOnce();
    const content = marker.mock.calls[0]![1];
    expect(content).toBeInstanceOf(HTMLAnchorElement);
    expect({
      href: content.getAttribute('href'),
      target: content.getAttribute('target'),
      rel: content.getAttribute('rel'),
      name: content.getAttribute('aria-label'),
      title: content.title,
      image: content.querySelector('img')?.getAttribute('src')
    }).toMatchInlineSnapshot(`
      {
        "href": "https://yandex.ru/maps/?original",
        "image": "/marker.png",
        "name": "Место на карте",
        "rel": "noopener noreferrer",
        "target": "_blank",
        "title": "Место на карте",
      }
    `);
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
    button.innerHTML = '<span class="ymaps3--open-maps-button">Яндекс Карты</span>';
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
    approach(element);
    await ready.promise;
    publishTiles(2);
    expect(fallback?.hidden).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
    expect(marker).toHaveBeenCalledTimes(2);
    expect(marker.mock.calls[0]?.[1]).not.toBe(marker.mock.calls[1]?.[1]);
    expect(marker.mock.calls[1]?.[1].getAttribute('href')).toBe(content.getAttribute('href'));
    canvas.append(button);
    listener.mock.calls[1]?.[0].onStateChanged?.({
      getLayerState: () => ({ tilesReady: 1, tilesTotal: 1, tilesLoaded: 1 })
    });
    await vi.waitFor(() => expect(fallback?.hidden).toBe(true));
    expect(vi.getTimerCount()).toBe(scheduled ? 1 : 0);
  }
);
