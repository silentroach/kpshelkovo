import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import type { MapEventUpdateHandler } from '@yandex/ymaps3-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Place } from '@/lib/places/types';

import PlaceMap from '../PlaceMap.svelte';

const clustererProps = vi.hoisted(() => [] as YMapClustererProps[]);

vi.mock('@yandex/ymaps3-clusterer', () => ({
  YMapClusterer: vi.fn(function YMapClusterer(props: YMapClustererProps) {
    clustererProps.push(props);
    for (const feature of props.features) props.marker(feature);
    return {};
  }),
  clusterByGrid: vi.fn(() => ({ render: vi.fn() })),
}));

const map = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
  zoom: 15,
};
const markerElements: HTMLElement[] = [];
const mapElements: HTMLElement[] = [];
const mapUpdateHandlers: MapEventUpdateHandler[] = [];
const schemeLayerProps: unknown[] = [];
const mapProps: {
  readonly behaviors?: readonly string[];
  readonly location: {
    readonly bounds?: readonly (readonly [number, number])[];
  };
}[] = [];

const place: Place = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  category: 'food',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  body: '',
  mentions: [],
  address: 'Шелково Форест, Берёзовая улица, 21А',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  mapUrl: 'https://yandex.ru/navi/-/CTfgq-5r',
  openingHours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opensAt: '10:00',
        closesAt: '22:00',
      },
    ],
  },
  contact: {
    id: 'food/burzhuyka',
    url: '/sarafan/food/burzhuyka/',
  },
  url: '/map/burzhuyka/',
  markdownUrl: '/map/burzhuyka/index.md',
  canonical: 'https://kpshelkovo.online/map/burzhuyka/',
};
const titanicPlace: Place = {
  ...place,
  slug: 'titanic',
  name: 'Детская площадка «Титаник»',
  category: 'children',
  marker: 'titanic',
  coordinates: { lat: 55.060703, lng: 37.746894 },
  url: '/map/titanic/',
  markdownUrl: '/map/titanic/index.md',
  canonical: 'https://kpshelkovo.online/map/titanic/',
};

const installYandexMaps = (): void => {
  Object.defineProperty(window, 'ymaps3', {
    configurable: true,
    writable: true,
    value: {
      ready: Promise.resolve(),
      YMap: vi.fn(function YMap(
        element: HTMLElement,
        props: (typeof mapProps)[number],
      ) {
        mapElements.push(element);
        mapProps.push(props);
        return map;
      }),
      YMapDefaultSchemeLayer: vi.fn(function YMapDefaultSchemeLayer(
        props: unknown,
      ) {
        schemeLayerProps.push(props);
        return {};
      }),
      YMapDefaultFeaturesLayer: vi.fn(function YMapDefaultFeaturesLayer() {
        return {};
      }),
      YMapListener: vi.fn(function YMapListener(props: {
        readonly onUpdate?: MapEventUpdateHandler;
      }) {
        if (props.onUpdate) mapUpdateHandlers.push(props.onUpdate);
        return {};
      }),
      YMapMarker: vi.fn(function YMapMarker(_: unknown, element: HTMLElement) {
        markerElements.push(element);
        return {};
      }),
    },
  });
};

describe('PlaceMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    markerElements.length = 0;
    mapElements.length = 0;
    mapUpdateHandlers.length = 0;
    clustererProps.length = 0;
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    installYandexMaps();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the place as an accessible detail link and fits the settlement', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(markerElements).toHaveLength(1));

    expect(markerElements[0]).toMatchInlineSnapshot(`
      <a
        aria-label="Открыть место «Буржуйка», сейчас закрыто"
        class="place-map-marker"
        data-open="false"
        data-status="existing"
        href="/map/burzhuyka/"
        title="Буржуйка, сейчас закрыто"
      >
        <span
          aria-hidden="true"
          class="place-map-marker-point ui-map-marker"
        />
      </a>
    `);
    expect(mapProps[0]).toMatchObject({
      behaviors: ['drag', 'scrollZoom', 'dblClick'],
      mode: 'vector',
      location: {
        bounds: [
          [37.709, 55.049],
          [37.764, 55.081],
        ],
      },
    });
    expect(schemeLayerProps[0]).toEqual({
      layers: {
        ground: { zIndex: 0 },
        buildings: { zIndex: 1 },
        icons: { visible: false, zIndex: 2 },
        labels: { zIndex: 3 },
      },
    });

    const marker = markerElements[0] as HTMLAnchorElement;
    const click = vi.spyOn(marker, 'click').mockImplementation(() => {});

    await fireEvent.keyDown(marker, { key: ' ' });
    expect(click).toHaveBeenCalledOnce();
  });

  it('supports dragging and a closer fit on mobile', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(mapProps).toHaveLength(1));

    expect(mapProps[0]?.behaviors).toEqual(['drag', 'pinchZoom', 'dblClick']);
    expect(map.update.mock.lastCall?.[0].margin).toEqual([112, 32, 32, 32]);
  });

  it('uses the selected custom marker', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, {
      props: {
        places: [
          { ...place, marker: 'foodtruck' },
          titanicPlace,
          {
            ...titanicPlace,
            slug: 'construction',
            name: 'Строительство',
            marker: 'construction',
            status: 'underConstruction',
          },
        ],
      },
    });

    await waitFor(() => expect(markerElements).toHaveLength(3));

    const markerDetails = markerElements.map((marker) => {
      const image = marker.querySelector('img');

      return {
        marker: marker.dataset.marker,
        graphicClass: marker.querySelector('[aria-hidden="true"]')?.className,
        imageClass: image?.className,
        imageDimensions: [image?.width, image?.height],
        imageFile: image?.src.split('/').at(-1),
        usesDefaultPoint: Boolean(marker.querySelector('.ui-map-marker')),
      };
    });

    expect(markerDetails).toMatchInlineSnapshot(`
      [
        {
          "graphicClass": "place-map-marker-graphic",
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            128,
          ],
          "imageFile": "Foodtruck.png",
          "marker": "foodtruck",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            137,
          ],
          "imageFile": "Titanic.png",
          "marker": "titanic",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            141,
          ],
          "imageFile": "Construction.png",
          "marker": "construction",
          "usesDefaultPoint": false,
        },
      ]
    `);
    expect({
      ariaLabel: markerElements[2]?.getAttribute('aria-label'),
      title: markerElements[2]?.title,
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Строительство», Строится, сейчас закрыто",
        "title": "Строительство",
      }
    `);
    expect(mapProps[0]?.location.bounds).toMatchInlineSnapshot(`
      [
        [
          37.707046,
          55.060473,
        ],
        [
          37.75609,
          55.060756,
        ],
      ]
    `);
  });

  it('refreshes opening state while the map remains open', async () => {
    vi.setSystemTime(new Date('2026-08-17T06:59:00.000Z'));
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const setInterval = vi.spyOn(window, 'setInterval');
    const clearInterval = vi.spyOn(window, 'clearInterval');
    const view = render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(markerElements).toHaveLength(1));

    const marker = markerElements[0];
    expect({
      open: marker?.dataset.open,
      title: marker?.title,
      ariaLabel: marker?.getAttribute('aria-label'),
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Буржуйка», сейчас закрыто",
        "open": "false",
        "title": "Буржуйка, сейчас закрыто",
      }
    `);

    const timerIndex = setInterval.mock.calls.findIndex(
      ([, delay]) => delay === 60_000,
    );
    const update = setInterval.mock.calls[timerIndex]?.[0];
    const timer = setInterval.mock.results[timerIndex]?.value;

    expect(timerIndex).toBeGreaterThanOrEqual(0);
    if (typeof update !== 'function') {
      throw new Error('marker refresh callback was not scheduled');
    }

    vi.setSystemTime(new Date('2026-08-17T07:00:00.000Z'));
    update();

    expect({
      open: marker?.dataset.open,
      title: marker?.title,
      ariaLabel: marker?.getAttribute('aria-label'),
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Буржуйка», открыто сейчас",
        "open": "true",
        "title": "Буржуйка, открыто сейчас",
      }
    `);

    view.unmount();
    expect(clearInterval).toHaveBeenCalledWith(timer);
  });

  it('shrinks marker graphics smoothly while preserving their hit areas', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));

    const mapElement = mapElements[0];
    const update = mapUpdateHandlers[0];

    if (!mapElement || !update)
      throw new Error('map update listener is missing');

    const scales = [
      mapElement.style.getPropertyValue('--place-map-marker-scale'),
    ];
    for (const zoom of [13.5, 16]) {
      update({
        type: 'update',
        location: {
          center: [37.74, 55.06],
          zoom,
          bounds: [
            [37.7, 55.04],
            [37.77, 55.08],
          ],
        },
        camera: {},
        mapInAction: false,
      });
      scales.push(
        mapElement.style.getPropertyValue('--place-map-marker-scale'),
      );
    }

    expect(scales).toMatchInlineSnapshot(`
      [
        "0.850",
        "0.625",
        "1.000",
      ]
    `);
  });

  it('renders an accessible cluster that zooms to its places', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, { props: { places: [place, titanicPlace] } });

    await waitFor(() => expect(clustererProps).toHaveLength(1));

    const props = clustererProps[0];

    if (!props) throw new Error('clusterer props are missing');

    props.cluster([37.731568, 55.060615], props.features);
    const cluster = markerElements.at(-1);

    expect(cluster).toMatchInlineSnapshot(`
      <button
        aria-label="2 места рядом. Приблизить карту"
        class="place-map-cluster"
        data-place-ids="burzhuyka titanic"
        title="2 места рядом"
        type="button"
      >
        2
      </button>
    `);

    const mapElement = mapElements[0];
    const marker = markerElements[0];
    const update = mapUpdateHandlers[0];

    if (!cluster || !mapElement || !marker || !update) {
      throw new Error('cluster focus fixtures are missing');
    }

    mapElement.append(cluster);

    await fireEvent.click(cluster, { detail: 1 });

    expect(map.update).toHaveBeenLastCalledWith({
      location: {
        bounds: [
          [37.707046, 55.060473],
          [37.75609, 55.060756],
        ],
        duration: 220,
        easing: 'ease-in-out',
      },
      margin: [112, 80, 32, 80],
    });

    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    await fireEvent.click(cluster, { detail: 1 });

    expect(map.update.mock.lastCall?.[0].location.duration).toBe(0);

    cluster.focus();
    await fireEvent.click(cluster, { detail: 0 });
    cluster.replaceWith(marker);
    update({
      type: 'update',
      location: {
        center: [37.74, 55.06],
        zoom: 16,
        bounds: [
          [37.7, 55.04],
          [37.77, 55.08],
        ],
      },
      camera: {},
      mapInAction: false,
    });

    await waitFor(() => expect(document.activeElement).toBe(marker));
  });

  it('shows the fallback when the loaded API global is missing', async () => {
    const api = window.ymaps3;
    let reads = 0;

    Object.defineProperty(window, 'ymaps3', {
      configurable: true,
      get: () => (++reads === 1 ? api : undefined),
    });

    render(PlaceMap, { props: { places: [place] } });

    const status = await screen.findByRole('status');

    expect(status.textContent).toContain('Карта сейчас недоступна');
    expect(screen.queryByText('Загружаем карту…')).toBeNull();
  });
});
