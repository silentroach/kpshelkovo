import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import type {
  MapEventUpdateHandler,
  YMapFeatureProps,
} from '@yandex/ymaps3-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaceMapItem } from '@/lib/places/map-types';
import type { PlaceMapPublicItemDto } from '@/lib/places/map-public-dto';

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
const areaFeatures: Array<{
  readonly props: YMapFeatureProps;
  readonly update: ReturnType<typeof vi.fn>;
}> = [];
const schemeLayerProps: unknown[] = [];
const mapProps: {
  readonly behaviors?: readonly string[];
  readonly location: {
    readonly bounds?: readonly (readonly [number, number])[];
  };
}[] = [];

const place: PlaceMapItem = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  status: 'existing',
  coordinates: { lat: 55.060526, lng: 37.716242 },
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
  url: '/map/burzhuyka/',
};
const publicPlace: PlaceMapPublicItemDto = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  status: 'existing',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  opening_hours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opens_at: '10:00',
        closes_at: '22:00',
      },
    ],
  },
  html_url: 'https://kpshelkovo.online/map/burzhuyka/',
};
const titanicPlace: PlaceMapItem = {
  ...place,
  slug: 'titanic',
  name: 'Детская площадка «Титаник»',
  marker: 'titanic',
  coordinates: { lat: 55.060703, lng: 37.746894 },
  url: '/map/titanic/',
};
const pondsPlace: PlaceMapItem = {
  ...titanicPlace,
  slug: 'hunting-ponds',
  name: 'Охотничьи пруды',
  marker: 'fish',
  coordinates: { lat: 55.05717, lng: 37.744987 },
  geometry: {
    area: {
      precision: 'approximate',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [37.74, 55.05],
              [37.75, 55.05],
              [37.75, 55.06],
              [37.74, 55.05],
            ],
          ],
        ],
      },
    },
  },
  url: '/map/hunting-ponds/',
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
      YMapFeature: vi.fn(function YMapFeature(props: YMapFeatureProps) {
        const feature = { props, update: vi.fn() };

        areaFeatures.push(feature);
        return feature;
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
    areaFeatures.length = 0;
    clustererProps.length = 0;
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    document.documentElement.style.setProperty('--color-water', '#1c668c');
    window.history.replaceState({}, '', '/map/');
    installYandexMaps();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--color-water');
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
        title="Буржуйка
      сейчас закрыто"
      >
        <span
          aria-hidden="true"
          class="place-map-marker-point"
        >
          <span
            class="place-map-marker-point-surface ui-map-marker"
          />
          <span
            class="place-map-marker-closed-indicator"
          />
        </span>
      </a>
    `);
    expect(mapProps[0]).toMatchObject({
      behaviors: [
        'drag',
        'scrollZoom',
        'pinchZoom',
        'dblClick',
        'oneFingerZoom',
      ],
      mode: 'vector',
      location: {
        bounds: [
          [37.708, 55.049],
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

  it('loads map places from JSON before applying a requested highlight', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka');
    const fetch = vi.fn(async () =>
      Response.json({
        places: [publicPlace],
      }),
    );
    vi.stubGlobal('fetch', fetch);

    render(PlaceMap, {
      props: {
        dataUrl: '/map/data/places.json',
      },
    });

    await waitFor(() => expect(markerElements).toHaveLength(1));

    expect(fetch).toHaveBeenCalledWith('/map/data/places.json');
    expect(markerElements[0]?.dataset.highlighted).toBe('true');
  });

  it('clears a requested highlight when map data cannot be loaded', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka&from=issue');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(undefined, { status: 503 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(PlaceMap, {
      props: {
        dataUrl: '/map/data/places.json',
        fallbackPlace: {
          name: place.name,
          url: place.url,
        },
      },
    });

    await screen.findByRole('status');

    expect({
      href: screen.getByRole('link').getAttribute('href'),
      url: `${window.location.pathname}${window.location.search}`,
    }).toMatchInlineSnapshot(`
      {
        "href": "/map/burzhuyka/",
        "url": "/map/?from=issue",
      }
    `);
  });

  it('supports navigation gestures and a closer fit on mobile', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(mapProps).toHaveLength(1));

    expect(mapProps[0]?.behaviors).toEqual([
      'drag',
      'scrollZoom',
      'pinchZoom',
      'dblClick',
      'oneFingerZoom',
    ]);
    expect(map.update.mock.lastCall?.[0].margin).toEqual([112, 32, 32, 32]);
  });

  it('uses the selected custom marker', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, {
      props: {
        places: [
          {
            ...titanicPlace,
            slug: 'apple-garden',
            name: 'Яблоневый сад',
            marker: 'apple',
          },
          { ...place, marker: 'foodtruck' },
          titanicPlace,
          {
            ...titanicPlace,
            slug: 'construction',
            name: 'Строительство',
            marker: 'construction',
            status: 'underConstruction',
          },
          {
            ...titanicPlace,
            slug: 'hunting-ponds',
            name: 'Охотничьи пруды',
            marker: 'fish',
          },
          {
            ...titanicPlace,
            slug: 'forest-checkpoint',
            name: 'КПП Фореста',
            marker: 'kpp',
          },
          {
            ...titanicPlace,
            slug: 'animals-wehome',
            name: 'Животные в Зеркальных домах',
            marker: 'animals',
          },
        ],
      },
    });

    await waitFor(() => expect(markerElements).toHaveLength(7));

    const markerDetails = markerElements.map((marker) => {
      const image = marker.querySelector('img');

      return {
        marker: marker.dataset.marker,
        graphicClass: marker.querySelector('[aria-hidden="true"]')?.className,
        hasClosedIndicator: Boolean(
          marker.querySelector('.place-map-marker-closed-indicator'),
        ),
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
          "hasClosedIndicator": true,
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            144,
          ],
          "imageFile": "Apple.png",
          "marker": "apple",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "hasClosedIndicator": true,
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
          "hasClosedIndicator": true,
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
          "hasClosedIndicator": true,
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            141,
          ],
          "imageFile": "Construction.png",
          "marker": "construction",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "hasClosedIndicator": true,
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            144,
          ],
          "imageFile": "Fish.png",
          "marker": "fish",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "hasClosedIndicator": true,
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            137,
          ],
          "imageFile": "Kpp.png",
          "marker": "kpp",
          "usesDefaultPoint": false,
        },
        {
          "graphicClass": "place-map-marker-graphic",
          "hasClosedIndicator": true,
          "imageClass": "place-map-marker-image",
          "imageDimensions": [
            144,
            144,
          ],
          "imageFile": "Animals.png",
          "marker": "animals",
          "usesDefaultPoint": false,
        },
      ]
    `);
    expect({
      ariaLabel: markerElements[3]?.getAttribute('aria-label'),
      title: markerElements[3]?.title,
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

  it('focuses and highlights the requested place for five seconds', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const historyState = { navigation: 'map' };
    window.history.replaceState(
      historyState,
      '',
      '/map/?q=a%20b&flag&h=titanic#map',
    );
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const setTimeout = vi.spyOn(window, 'setTimeout');

    render(PlaceMap, { props: { places: [place, titanicPlace] } });

    await waitFor(() => expect(markerElements).toHaveLength(2));

    const marker = markerElements[1];
    const focusUpdate = map.update.mock.calls
      .map(([update]) => update)
      .find((update) => update.location?.center);
    const timerIndex = setTimeout.mock.calls.findIndex(
      ([, delay]) => delay === 5_000,
    );
    const expireHighlight = setTimeout.mock.calls[timerIndex]?.[0];
    const timer = setTimeout.mock.results[timerIndex]?.value;

    expect({
      marker: {
        current: marker?.getAttribute('aria-current'),
        highlighted: marker?.dataset.highlighted,
      },
      focusUpdate,
      clusterMaxZoom: clustererProps[0]?.maxZoom,
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    }).toMatchInlineSnapshot(`
      {
        "clusterMaxZoom": 15,
        "focusUpdate": {
          "location": {
            "center": [
              37.746894,
              55.060703,
            ],
            "duration": 220,
            "easing": "ease-in-out",
            "zoom": 16,
          },
        },
        "marker": {
          "current": "location",
          "highlighted": "true",
        },
        "url": "/map/?q=a%20b&flag&h=titanic#map",
      }
    `);

    if (typeof expireHighlight !== 'function') {
      throw new Error('place highlight callback was not scheduled');
    }

    window.clearTimeout(timer);
    expireHighlight();

    expect({
      marker: {
        current: marker?.getAttribute('aria-current'),
        highlighted: marker?.dataset.highlighted,
      },
      replaceState: replaceState.mock.lastCall,
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    }).toMatchInlineSnapshot(`
      {
        "marker": {
          "current": null,
          "highlighted": undefined,
        },
        "replaceState": [
          {
            "navigation": "map",
          },
          "",
          "/map/?q=a%20b&flag#map",
        ],
        "url": "/map/?q=a%20b&flag#map",
      }
    `);
  });

  it('previews an area on fine-pointer hover and keyboard focus', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('(hover: hover)'),
    }));

    render(PlaceMap, { props: { places: [pondsPlace] } });

    await waitFor(() => expect(areaFeatures).toHaveLength(1));

    const feature = areaFeatures[0];
    const marker = markerElements[0];

    if (!feature || !marker)
      throw new Error('area preview fixtures are missing');

    expect({
      id: feature.props.id,
      geometry: feature.props.geometry,
      initialStyle: feature.props.style,
    }).toMatchInlineSnapshot(`
      {
        "geometry": {
          "coordinates": [
            [
              [
                [
                  37.74,
                  55.05,
                ],
                [
                  37.75,
                  55.05,
                ],
                [
                  37.75,
                  55.06,
                ],
                [
                  37.74,
                  55.05,
                ],
              ],
            ],
          ],
          "type": "MultiPolygon",
        },
        "id": "hunting-ponds-area",
        "initialStyle": {
          "fillOpacity": 0,
          "interactive": false,
          "stroke": [],
          "zIndex": 0,
        },
      }
    `);

    await fireEvent.mouseEnter(marker);
    expect(feature.update.mock.lastCall?.[0].style).toMatchInlineSnapshot(`
      {
        "fill": "#1c668c",
        "fillOpacity": 0,
        "interactive": true,
        "simplificationRate": 0,
        "stroke": [
          {
            "color": "#1c668c",
            "dash": [
              5,
              4,
            ],
            "opacity": 0.42,
            "width": 4,
          },
          {
            "color": "#1c668c",
            "dash": [
              5,
              4,
            ],
            "opacity": 1,
            "width": 2,
          },
        ],
        "zIndex": 0,
      }
    `);

    const featureMouseEnter = feature.props.onMouseEnter;
    const featureMouseLeave = feature.props.onMouseLeave;

    if (!featureMouseEnter || !featureMouseLeave) {
      throw new Error('area hover handlers are missing');
    }

    await fireEvent.mouseLeave(marker);
    featureMouseEnter(new MouseEvent('mouseenter'), {
      screenCoordinates: [0, 0],
      coordinates: [37.74, 55.05],
      details: {
        type: 'mouseenter',
        shiftKey: false,
        altKey: false,
        metaKey: false,
      },
      stopPropagation: vi.fn(),
    });
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
      fillOpacity: 0,
      interactive: true,
    });

    featureMouseLeave(new MouseEvent('mouseleave'), {
      screenCoordinates: [0, 0],
      coordinates: [37.74, 55.05],
      details: {
        type: 'mouseleave',
        shiftKey: false,
        altKey: false,
        metaKey: false,
      },
      stopPropagation: vi.fn(),
    });
    expect(feature.update.mock.lastCall?.[0].style).toEqual({
      zIndex: 0,
      fillOpacity: 0,
      interactive: false,
      stroke: [],
    });

    await fireEvent.focus(marker);
    expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
      fillOpacity: 0,
      interactive: true,
    });

    await fireEvent.keyDown(marker, { key: 'Escape' });
    expect(feature.update.mock.lastCall?.[0].style).toEqual({
      zIndex: 0,
      fillOpacity: 0,
      interactive: false,
      stroke: [],
    });
  });

  it('shows an area with stronger styling during URL highlight', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=hunting-ponds');

    render(PlaceMap, { props: { places: [pondsPlace] } });

    await waitFor(() =>
      expect(areaFeatures[0]?.update).toHaveBeenCalledWith({
        style: expect.objectContaining({
          fillOpacity: 0,
          interactive: false,
          stroke: expect.arrayContaining([
            expect.objectContaining({ dash: [6, 3], width: 2.5 }),
          ]),
        }),
      }),
    );
  });

  it('removes an unknown highlight slug without changing the map view', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const historyState = { navigation: 'map' };
    window.history.replaceState(historyState, '', '/map/?h=titanik&from=issue');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    render(PlaceMap, { props: { places: [place, titanicPlace] } });

    await waitFor(() => expect(markerElements).toHaveLength(2));

    expect({
      focused: map.update.mock.calls.some(([update]) =>
        Boolean(update.location?.center),
      ),
      highlights: markerElements.map((marker) => marker.dataset.highlighted),
      replaceState: replaceState.mock.lastCall,
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    }).toMatchInlineSnapshot(`
      {
        "focused": false,
        "highlights": [
          undefined,
          undefined,
        ],
        "replaceState": [
          {
            "navigation": "map",
          },
          "",
          "/map/?from=issue",
        ],
        "url": "/map/?from=issue",
      }
    `);
  });

  it('cancels the place highlight timer when the map unmounts', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka');
    const setTimeout = vi.spyOn(window, 'setTimeout');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const view = render(PlaceMap, { props: { places: [place] } });

    await waitFor(() =>
      expect(setTimeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(
        true,
      ),
    );

    const timerIndex = setTimeout.mock.calls.findIndex(
      ([, delay]) => delay === 5_000,
    );
    const timer = setTimeout.mock.results[timerIndex]?.value;

    view.unmount();

    expect(clearTimeout).toHaveBeenCalledWith(timer);
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
        "title": "Буржуйка
      сейчас закрыто",
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
        "ariaLabel": "Открыть место «Буржуйка», открыто до 22:00",
        "open": "true",
        "title": "Буржуйка
      открыто до 22:00",
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
    for (const zoom of [13.5, 16, 17, 18]) {
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
        "1.150",
        "1.300",
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
