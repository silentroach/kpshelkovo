import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import type {
  MapEventUpdateHandler,
  YMapControlsProps,
  YMapFeatureProps
} from '@yandex/ymaps3-types';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLACE_MARKER_IMAGES } from '@/components/places/marker-images';
import type { ParcelDetailsPublicDto } from '@/lib/parcels/details-public-schema';
import type { PlaceMapPublicItemDto } from '@/lib/places/map-public-dto';
import type { PlaceMapItem } from '@/lib/places/map-types';

import { getPlaceBounds } from '../place-map-geometry';
import PlaceMap from '../PlaceMap.svelte';

const clustererProps = vi.hoisted(() => [] as YMapClustererProps[]);
const clustererImport = vi.hoisted(() => vi.fn<() => Promise<void>>());

const map = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
  zoom: 15,
  bounds: [
    [37.7, 55.04],
    [37.8, 55.08]
  ] as [[number, number], [number, number]]
};
const nativeControl = {};
const createControl = vi.fn(function (_props: YMapControlsProps, _children: readonly unknown[]) {
  return nativeControl;
});
const extras = { YMapOpenMapsButton: vi.fn(function () {}) };
const importModule = vi.fn(async (_module: string) => extras);
const markerElements: HTMLElement[] = [];
const markerLocations: Array<{ readonly coordinates: readonly [number, number] }> = [];
const mapElements: HTMLElement[] = [];
const mapUpdateHandlers: MapEventUpdateHandler[] = [];
const mapClickHandlers: Array<(object?: unknown) => void> = [];
const anchorElements: HTMLElement[] = [];
const areaFeatures: Array<{
  readonly props: YMapFeatureProps;
  readonly update: ReturnType<typeof vi.fn>;
}> = [];
const schemeLayerProps: unknown[] = [];
const mapProps: {
  readonly behaviors?: readonly string[];
  readonly margin?: readonly number[];
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
        closesAt: '22:00'
      }
    ]
  },
  url: '/map/burzhuyka/'
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
        closes_at: '22:00'
      }
    ]
  },
  html_url: 'https://kpshelkovo.online/map/burzhuyka/'
};
const titanicPlace: PlaceMapItem = {
  ...place,
  slug: 'titanic',
  name: 'Детская площадка «Титаник»',
  marker: 'titanic',
  coordinates: { lat: 55.060703, lng: 37.746894 },
  url: '/map/titanic/'
};
const pondsPlace: PlaceMapItem = {
  ...titanicPlace,
  slug: 'hunting-ponds',
  name: 'Охотничьи пруды',
  marker: 'fish',
  coordinates: { lat: 55.05717, lng: 37.744987 },
  geometry: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [37.742, 55.058] },
        iconCaption: '<b>Вход</b>',
        markerColor: '#b42c31'
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [37.742, 55.058],
            [37.748, 55.06]
          ]
        },
        stroke: '#123456',
        strokeWidth: 3,
        strokeDasharray: [6, 3]
      },
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [37.74, 55.05],
                [37.75, 55.05],
                [37.75, 55.06],
                [37.74, 55.05]
              ]
            ],
            [
              [
                [37.76, 55.06],
                [37.77, 55.06],
                [37.77, 55.07],
                [37.76, 55.06]
              ]
            ]
          ]
        },
        fill: '#aaccdd',
        fillOpacity: 0.24,
        stroke: '#456789',
        strokeOpacity: 0.7,
        precision: 'approximate'
      }
    ]
  },
  url: '/map/hunting-ponds/'
};
const publicPondsPlace: PlaceMapPublicItemDto = {
  ...publicPlace,
  slug: 'hunting-ponds',
  geometry: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 0,
        geometry: { type: 'Point', coordinates: [37.742, 55.058] },
        properties: { iconCaption: '<b>Вход</b>', iconContent: '0', 'marker-color': '#b42c31' }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [37.742, 55.058],
            [37.748, 55.06]
          ]
        },
        properties: { stroke: '#123456', 'stroke-width': 3, 'stroke-dasharray': [6, 3] }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [37.74, 55.05],
              [37.75, 55.05],
              [37.75, 55.06],
              [37.74, 55.05]
            ],
            [
              [37.743, 55.052],
              [37.746, 55.052],
              [37.746, 55.054],
              [37.743, 55.052]
            ]
          ]
        },
        properties: { fill: '#aaccdd', 'fill-opacity': 0.24, precision: 'approximate' }
      }
    ]
  }
};
const parcel = {
  code: 'SHR-L43',
  aliases: ['SHR-L44'],
  part: 'shr',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [37.71, 55.06],
        [37.72, 55.06],
        [37.72, 55.07],
        [37.71, 55.06]
      ]
    ]
  },
  labelCoordinates: [37.715, 55.065]
};
const parcelContours = [
  [
    [
      [37.71, 55.06],
      [37.72, 55.06],
      [37.72, 55.07],
      [37.71, 55.07],
      [37.71, 55.06]
    ]
  ],
  [
    [
      [37.72, 55.06],
      [37.73, 55.06],
      [37.73, 55.07],
      [37.72, 55.07],
      [37.72, 55.06]
    ]
  ],
  [
    [
      [37.73, 55.06],
      [37.74, 55.06],
      [37.74, 55.07],
      [37.73, 55.07],
      [37.73, 55.06]
    ]
  ]
] as const;
const parcelFetch = vi.fn(async (url: string) => {
  if (url === '/map/data/parcels/shr.json') return Response.json([parcel]);
  throw new Error(`Unexpected request: ${url}`);
});
const details: ParcelDetailsPublicDto = {
  code: parcel.code,
  status: 'available',
  area: 1050.5,
  price: {
    last: 12_000_000,
    history: [
      ['2026-09-01', 14_000_000],
      ['2026-09-02', 12_000_000]
    ]
  }
};
const parcelWithDetails = vi.fn(async (url: string) =>
  url.endsWith('/details/SHR-L43.json')
    ? Response.json(details)
    : Response.json([{ ...parcel, status: 'available' }])
);
const parcelSelectionColor = '#365f7d';

const installYandexMaps = (): void => {
  Object.defineProperty(window, 'ymaps3', {
    configurable: true,
    writable: true,
    value: {
      ready: Promise.resolve(),
      import: importModule,
      YMapControls: createControl,
      YMap: vi.fn(function YMap(element: HTMLElement, props: (typeof mapProps)[number]) {
        mapElements.push(element);
        mapProps.push(props);
        return map;
      }),
      YMapDefaultSchemeLayer: vi.fn(function YMapDefaultSchemeLayer(props: unknown) {
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
        readonly onClick?: (object?: unknown) => void;
      }) {
        if (props.onUpdate) mapUpdateHandlers.push(props.onUpdate);
        if (props.onClick) mapClickHandlers.push(props.onClick);
        return {};
      }),
      YMapMarker: vi.fn(function YMapMarker(
        props: { readonly coordinates: readonly [number, number] },
        element: HTMLElement
      ) {
        if (element.classList.contains('parcel-map-popup-anchor')) {
          anchorElements.push(element);
          mapElements[0]?.append(element);
          return {};
        }
        markerLocations.push(props);
        markerElements.push(element);
        return {};
      })
    }
  });
};

describe('PlaceMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    clustererImport.mockResolvedValue(undefined);
    vi.doMock('@yandex/ymaps3-clusterer', async () => {
      await clustererImport();
      return {
        YMapClusterer: vi.fn(function YMapClusterer(props: YMapClustererProps) {
          clustererProps.push(props);
          for (const feature of props.features) props.marker(feature);
          return {};
        }),
        clusterByGrid: vi.fn(() => ({ render: vi.fn() }))
      };
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    markerElements.length = 0;
    markerLocations.length = 0;
    mapElements.length = 0;
    mapUpdateHandlers.length = 0;
    mapClickHandlers.length = 0;
    anchorElements.length = 0;
    areaFeatures.length = 0;
    clustererProps.length = 0;
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    map.zoom = 15;
    document.documentElement.style.setProperty('--color-water', '#1c668c');
    document.documentElement.style.setProperty('--color-neutral-soft', '#eef0ec');
    document.documentElement.style.setProperty('--color-text-muted', '#45564b');
    document.documentElement.style.setProperty('--color-accent', '#d6a22a');
    document.documentElement.style.setProperty('--color-accent-text', '#805019');
    document.documentElement.style.setProperty('--parcel-map-boundary', '#64748b');
    document.documentElement.style.setProperty('--parcel-map-selection', parcelSelectionColor);
    window.history.replaceState({}, '', '/map/');
    installYandexMaps();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--color-water');
    for (const name of [
      '--color-neutral-soft',
      '--color-text-muted',
      '--color-accent',
      '--color-accent-text',
      '--parcel-map-boundary',
      '--parcel-map-selection'
    ]) {
      document.documentElement.style.removeProperty(name);
    }
  });

  it('renders the place as an accessible detail link and fits its coordinates', async () => {
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
      behaviors: ['drag', 'scrollZoom', 'pinchZoom', 'dblClick', 'oneFingerZoom'],
      mode: 'vector',
      copyrightsPosition: 'bottom left',
      distributionPosition: 'bottom right',
      location: {
        bounds: [
          [37.715242, 55.059526],
          [37.717242, 55.061526]
        ]
      }
    });
    expect(schemeLayerProps[0]).toEqual({
      layers: {
        ground: { zIndex: 0 },
        buildings: { zIndex: 1 },
        icons: { visible: false, zIndex: 2 },
        labels: { zIndex: 3 }
      }
    });

    const marker = markerElements[0] as HTMLAnchorElement;
    const click = vi.spyOn(marker, 'click').mockImplementation(() => {});

    await fireEvent.keyDown(marker, { key: ' ' });
    expect(click).toHaveBeenCalledOnce();
  });

  it('adds the bottom-right native control once per mount and destroys its owning map', async () => {
    const first = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() =>
      expect(map.addChild.mock.calls.map(([child]) => child)).toContain(nativeControl)
    );
    expect(createControl.mock.calls[0]?.[0]).toEqual({ position: 'bottom right' });
    first.unmount();
    expect(map.destroy).toHaveBeenCalledOnce();

    const second = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(createControl).toHaveBeenCalledTimes(2));
    second.unmount();
    expect(map.destroy).toHaveBeenCalledTimes(2);
  });

  it('keeps the reserved map area unobstructed while the SDK is pending', async () => {
    const ready = Promise.withResolvers<void>();
    Object.defineProperty(window.ymaps3, 'ready', { value: ready.promise });

    render(PlaceMap, { props: { places: [place] } });

    expect(screen.getByTestId('place-map').children).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Слои' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
    expect(mapElements).toHaveLength(0);

    ready.resolve();
    await waitFor(() => expect(markerElements).toHaveLength(1));
    expect(screen.getByTestId('place-map').children).toHaveLength(2);
  });

  it('renders markers, highlighted geometry and parcels while the native control is pending', async () => {
    const imported = Promise.withResolvers<typeof extras>();
    importModule.mockReturnValueOnce(imported.promise);
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?h=hunting-ponds');

    render(PlaceMap, { props: { places: [pondsPlace, place] } });
    expect(screen.getByTestId('place-map').children).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Слои' }).hasAttribute('disabled')).toBe(true);
    await waitFor(() => expect(importModule).toHaveBeenCalledOnce());

    expect(screen.getByTestId('place-map').children).toHaveLength(2);
    expect(mapElements[0]?.hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('button', { name: 'Слои' }).hasAttribute('disabled')).toBe(false);
    expect(clustererProps).toHaveLength(1);
    const marker = markerElements.find((element) => element instanceof HTMLAnchorElement);
    expect(marker?.getAttribute('href')).toBe(pondsPlace.url);
    expect(marker?.dataset.highlighted).toBe('true');
    expect(map.addChild.mock.calls.map(([child]) => child)).toContain(areaFeatures[0]);
    expect(map.addChild.mock.calls.map(([child]) => child)).not.toContain(nativeControl);
    const clusters = clustererProps[0];
    if (!clusters) throw new Error('Clusterer missing');
    clusters.cluster([37.74, 55.06], clusters.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker missing');
    await fireEvent.click(cluster, { detail: 1 });
    expect(map.update.mock.lastCall?.[0].location.bounds).toBeDefined();

    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(screen.getByTestId('place-map').children).toHaveLength(2);

    imported.resolve(extras);
    await waitFor(() =>
      expect(map.addChild.mock.calls.map(([child]) => child)).toContain(nativeControl)
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['JSON', 'clusterer'] as const)(
    'creates one basemap before delayed %s and keeps a manually changed camera when markers arrive',
    async (delayed) => {
      const response = Promise.withResolvers<Response>();
      const imported = Promise.withResolvers<void>();
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise)
      );
      clustererImport.mockReturnValueOnce(imported.promise);
      if (delayed === 'JSON') imported.resolve();
      else response.resolve(Response.json({ places: [publicPlace] }));

      const initialBounds = getPlaceBounds([place]);
      render(PlaceMap, { props: { dataUrl: '/map/data/places.json', initialBounds } });
      await waitFor(() => expect(mapElements).toHaveLength(1));
      expect(mapProps[0]).toMatchObject({
        location: { bounds: initialBounds },
        margin: [112, 80, 32, 80]
      });
      expect(markerElements).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Слои' }).hasAttribute('disabled')).toBe(true);

      // A real resize during the data gap still fits the build-time collection.
      document.dispatchEvent(new Event('astro:page-load'));
      await waitFor(() => expect(map.update).toHaveBeenCalled());
      expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(initialBounds);
      map.zoom = 17; // SDK state after the user's zoom, before a listener exists.
      map.update({ location: { center: [37.8, 55.1], zoom: 17 } });
      const cameraUpdates = map.update.mock.calls.length;

      response.resolve(Response.json({ places: [publicPlace] }));
      imported.resolve();
      await waitFor(() => expect(markerElements).toHaveLength(1));
      expect(mapElements).toHaveLength(1);
      expect(map.update).toHaveBeenCalledTimes(cameraUpdates);
      expect(mapElements[0]?.style.getPropertyValue('--place-map-marker-scale')).toBe('1.150');
      expect(screen.getByRole('button', { name: 'Слои' }).hasAttribute('disabled')).toBe(false);
    }
  );

  it.each(['h=burzhuyka', 'p=shr-l44&h=burzhuyka'])(
    'waits for objects before applying delayed direct link %s',
    async (query) => {
      const response = Promise.withResolvers<Response>();
      const timeout = vi.spyOn(window, 'setTimeout');
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) =>
          url === '/map/data/places.json' ? response.promise : parcelFetch(url)
        )
      );
      window.history.replaceState({}, '', `/map/?${query}`);
      render(PlaceMap, {
        props: { dataUrl: '/map/data/places.json', initialBounds: getPlaceBounds([place]) }
      });
      await waitFor(() => expect(mapElements).toHaveLength(1));
      expect(map.update).not.toHaveBeenCalled();
      expect(timeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(false);
      expect(window.location.search).toBe(`?${query}`);

      response.resolve(Response.json({ places: [publicPlace] }));
      if (query.startsWith('p=')) {
        await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
        expect(map.update.mock.lastCall?.[0].location.zoom).toBe(17);
        expect(markerElements[0]?.dataset.highlighted).toBeUndefined();
        expect(timeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(false);
        expect(window.location.search).toBe('?h=burzhuyka&p=SHR-L43');
      } else {
        await waitFor(() => expect(markerElements[0]?.dataset.highlighted).toBe('true'));
        expect(map.update.mock.lastCall?.[0].location.zoom).toBe(16);
        expect(timeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(true);
      }
    }
  );

  it.each(['JSON', 'clusterer'] as const)(
    'cleans up an early map on %s failure without waiting for the other resource',
    async (failed) => {
      const response = Promise.withResolvers<Response>();
      const imported = Promise.withResolvers<void>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise)
      );
      clustererImport.mockReturnValueOnce(imported.promise);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState({}, '', '/map/?h=burzhuyka&from=issue');
      render(PlaceMap, { props: { dataUrl: '/map/data/places.json', fallbackPlace: place } });
      await waitFor(() => expect(mapElements).toHaveLength(1));

      if (failed === 'JSON') response.reject(new Error('Data unavailable'));
      else imported.reject(new Error('Clusterer unavailable'));
      await screen.findByRole('status');
      expect(map.destroy).toHaveBeenCalledOnce();
      expect(screen.getByRole('link').getAttribute('href')).toBe(place.url);
      expect(window.location.search).toBe('?from=issue');

      const replace = vi.spyOn(window.history, 'replaceState');
      // A second rejection must be observed too, even after setup has failed.
      if (failed === 'JSON') imported.reject(new Error('Late clusterer failure'));
      else response.reject(new Error('Late data failure'));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      expect(clustererProps).toHaveLength(0);
      expect(importModule).not.toHaveBeenCalled();
      expect(map.destroy).toHaveBeenCalledOnce();
      expect(replace).not.toHaveBeenCalled();
    }
  );

  it('handles a JSON rejection while SDK is pending and never creates a late map', async () => {
    const ready = Promise.withResolvers<void>();
    Object.defineProperty(window.ymaps3, 'ready', { value: ready.promise });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Data unavailable');
      })
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { dataUrl: '/map/data/places.json', fallbackPlace: place } });
    await screen.findByRole('status');
    ready.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    expect(mapElements).toHaveLength(0);
    expect(markerElements).toHaveLength(0);
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores resources that later %s after the early map unmounts',
    async (outcome) => {
      const response = Promise.withResolvers<Response>();
      const imported = Promise.withResolvers<void>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise)
      );
      clustererImport.mockReturnValueOnce(imported.promise);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState({}, '', '/map/?h=burzhuyka&p=shr-l44');
      const view = render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
      await waitFor(() => expect(mapElements).toHaveLength(1));
      view.unmount();
      window.history.replaceState({}, '', '/news/?h=burzhuyka&p=shr-l44');
      const replace = vi.spyOn(window.history, 'replaceState');
      if (outcome === 'resolve') {
        response.resolve(Response.json({ places: [publicPlace] }));
        imported.resolve();
      } else {
        response.reject(new Error('Stale data'));
        imported.reject(new Error('Stale import'));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      expect(mapElements).toHaveLength(1);
      expect(map.destroy).toHaveBeenCalledOnce();
      expect(markerElements).toHaveLength(0);
      expect(map.addChild).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'does not create a map or change the next page when SDK later %ss after unmount',
    async (outcome) => {
      const ready = Promise.withResolvers<void>();
      const response = Promise.withResolvers<Response>();
      const getReady = vi.fn(() => ready.promise);
      Object.defineProperty(window.ymaps3, 'ready', { get: getReady });
      const fetch = vi.fn(() => response.promise);
      vi.stubGlobal('fetch', fetch);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState({}, '', '/map/?h=burzhuyka');
      const view = render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
      await waitFor(() => expect(getReady).toHaveBeenCalledOnce());
      view.unmount();
      window.history.replaceState({}, '', '/news/?h=burzhuyka');
      const replace = vi.spyOn(window.history, 'replaceState');
      response.resolve(Response.json({ places: [publicPlace] }));
      if (outcome === 'resolve') ready.resolve();
      else ready.reject(new Error('Stale SDK'));
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      expect(mapElements).toHaveLength(0);
      expect(clustererImport).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    }
  );

  it('focuses a requested parcel without waiting for the native control', async () => {
    const imported = Promise.withResolvers<typeof extras>();
    importModule.mockReturnValueOnce(imported.promise);
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L43');

    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(importModule).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );

    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
    expect(map.addChild.mock.calls.map(([child]) => child)).not.toContain(nativeControl);
    expect(screen.getByTestId('place-map').children).toHaveLength(2);
  });

  it.each(['resolve', 'reject'] as const)(
    'does not add a control after unmount when its import later %ss',
    async (outcome) => {
      const imported = Promise.withResolvers<typeof extras>();
      importModule.mockReturnValueOnce(imported.promise);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const view = render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(importModule).toHaveBeenCalledOnce());
      view.unmount();
      expect(map.destroy).toHaveBeenCalledOnce();

      if (outcome === 'resolve') imported.resolve(extras);
      else imported.reject(new Error('Stale control'));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      expect(clustererProps).toHaveLength(1);
      expect(map.addChild.mock.calls.map(([child]) => child)).not.toContain(nativeControl);
      expect(log).not.toHaveBeenCalled();
    }
  );

  it('clears a prepared map and uses the place fallback when the control module fails', async () => {
    importModule.mockRejectedValueOnce(new Error('Control unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [pondsPlace] } });
    await screen.findByRole('status');
    expect(clustererProps).toHaveLength(1);
    expect(screen.getByRole('link').getAttribute('href')).toBe(pondsPlace.url);
    expect(map.destroy).toHaveBeenCalledOnce();
    expect(map.removeChild).toHaveBeenCalledTimes(2);
    expect(map.addChild.mock.calls.map(([child]) => child)).not.toContain(nativeControl);
  });

  it('cleans up active highlight and parcel layer after a late control import failure', async () => {
    const imported = Promise.withResolvers<typeof extras>();
    importModule.mockReturnValueOnce(imported.promise);
    vi.stubGlobal('fetch', parcelFetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    window.history.replaceState({}, '', '/map/?h=hunting-ponds');
    render(PlaceMap, { props: { places: [pondsPlace] } });

    await waitFor(() => expect(importModule).toHaveBeenCalledOnce());
    const highlighted = markerElements.find((element) => element instanceof HTMLAnchorElement);
    expect(highlighted?.dataset.highlighted).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );

    imported.reject(new Error('Control unavailable'));
    await screen.findByRole('status');
    expect(map.destroy).toHaveBeenCalledOnce();
    expect(map.removeChild).toHaveBeenCalledWith(areaFeatures[0]);
    expect(map.removeChild).toHaveBeenCalledWith(
      areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')
    );
    expect(clearTimeout).toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(screen.getByRole('link').getAttribute('href')).toBe(pondsPlace.url);
  });

  it('loads map places from JSON before applying a requested highlight', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka');
    const fetch = vi.fn(async () =>
      Response.json({
        places: [publicPlace]
      })
    );
    vi.stubGlobal('fetch', fetch);

    render(PlaceMap, {
      props: {
        dataUrl: '/map/data/places.json'
      }
    });

    await waitFor(() => expect(markerElements).toHaveLength(1));

    expect(fetch).toHaveBeenCalledWith('/map/data/places.json');
    expect(markerElements[0]?.getAttribute('href')).toBe('/map/burzhuyka/');
    expect(markerElements[0]?.dataset.highlighted).toBe('true');
  });

  it.each([
    ['2026-08-17T07:00:00.000Z', 'открыто до 22:00', 'true'],
    ['2026-08-18T12:00:00.000Z', 'сейчас закрыто', 'false']
  ])('uses JSON periods without an explanation at %s', async (time, status, open) => {
    vi.setSystemTime(new Date(time));
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          places: [
            { ...publicPlace, opening_hours: { periods: publicPlace.opening_hours!.periods } }
          ]
        })
      )
    );

    render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
    await waitFor(() => expect(markerElements).toHaveLength(1));

    expect(markerElements[0]?.dataset.open).toBe(open);
    expect(markerElements[0]?.title).toContain(status);
    expect(markerElements[0]?.getAttribute('aria-label')).toContain(status);
  });

  it('omits hours, opening status and placeholders when JSON has no schedule', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          places: [{ ...publicPlace, opening_hours: undefined }]
        })
      )
    );

    render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
    await waitFor(() => expect(markerElements).toHaveLength(1));

    const marker = markerElements[0];
    expect({
      open: marker?.dataset.open,
      title: marker?.title,
      ariaLabel: marker?.getAttribute('aria-label'),
      text: marker?.textContent
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Буржуйка»",
        "open": undefined,
        "text": "",
        "title": "Буржуйка",
      }
    `);
  });

  it('clears a requested highlight when map data cannot be loaded', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka&from=issue');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(undefined, { status: 503 }))
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(PlaceMap, {
      props: {
        dataUrl: '/map/data/places.json',
        fallbackPlace: {
          name: place.name,
          url: place.url
        }
      }
    });

    await screen.findByRole('status');

    expect({
      href: screen.getByRole('link').getAttribute('href'),
      url: `${window.location.pathname}${window.location.search}`
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
      'oneFingerZoom'
    ]);
    expect(mapProps[0]?.margin).toEqual([112, 32, 32, 32]);
    expect(mapProps[0]).toMatchObject({
      copyrightsPosition: 'bottom left',
      distributionPosition: 'bottom right'
    });
  });

  it.each(['apple', 'animals', 'construction', 'fish', 'foodtruck', 'kpp', 'titanic'] as const)(
    'uses the full-size %s image and preserves the place link and status',
    async (markerType) => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      render(PlaceMap, {
        props: {
          places: [
            { ...place, marker: markerType, status: 'underConstruction', statusLabel: 'Строится' }
          ]
        }
      });
      await waitFor(() => expect(markerElements).toHaveLength(1));

      const marker = markerElements[0]!;
      const image = marker.querySelector('img');
      const expected = PLACE_MARKER_IMAGES[markerType];
      expect(image).toMatchObject({
        src: new URL(expected.src, window.location.href).href,
        width: expected.width,
        height: expected.height,
        alt: '',
        draggable: false
      });
      expect(marker.dataset.marker).toBe(markerType);
      expect({
        imageAttributeOrder: image
          ?.getAttributeNames()
          .filter((name) => ['sizes', 'srcset', 'src'].includes(name)),
        href: marker.getAttribute('href'),
        status: marker.dataset.status,
        open: marker.dataset.open,
        ariaLabel: marker.getAttribute('aria-label'),
        title: marker.title,
        hasClosedIndicator: !!marker.querySelector('.place-map-marker-closed-indicator')
      }).toMatchInlineSnapshot(`
        {
          "ariaLabel": "Открыть место «Буржуйка», Строится, сейчас закрыто",
          "hasClosedIndicator": true,
          "href": "/map/burzhuyka/",
          "imageAttributeOrder": [
            "src",
          ],
          "open": "false",
          "status": "underConstruction",
          "title": "Буржуйка",
        }
      `);
    }
  );

  it('focuses and highlights the requested place for five seconds', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const historyState = { navigation: 'map' };
    window.history.replaceState(historyState, '', '/map/?q=a%20b&flag&h=titanic#map');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const setTimeout = vi.spyOn(window, 'setTimeout');

    render(PlaceMap, { props: { places: [place, titanicPlace] } });

    await waitFor(() => expect(markerElements).toHaveLength(2));

    const marker = markerElements[1];
    const focusUpdate = map.update.mock.calls
      .map(([update]) => update)
      .find((update) => update.location?.center);
    const timerIndex = setTimeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
    const expireHighlight = setTimeout.mock.calls[timerIndex]?.[0];
    const timer = setTimeout.mock.results[timerIndex]?.value;

    expect({
      marker: {
        current: marker?.getAttribute('aria-current'),
        highlighted: marker?.dataset.highlighted
      },
      focusUpdate,
      clusterMaxZoom: clustererProps[0]?.maxZoom,
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`
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
        highlighted: marker?.dataset.highlighted
      },
      replaceState: replaceState.mock.lastCall,
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`
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

  it('renders the full public collection as one hidden group, revealed by hover or focus', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('(hover: hover)') }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ places: [publicPondsPlace] }))
    );
    render(PlaceMap, {
      props: { dataUrl: '/map/data/places.json', initialBounds: getPlaceBounds([place]) }
    });
    await waitFor(() => expect(markerElements).toHaveLength(2));
    await waitFor(() =>
      expect(map.addChild.mock.calls.map(([child]) => child)).toContain(nativeControl)
    );

    const link = markerElements.find((element) => element instanceof HTMLAnchorElement);
    const caption = markerElements.find((element) => !(element instanceof HTMLAnchorElement));
    if (!link || !caption) throw new Error('Map markers are missing');
    expect(link.getAttribute('href')).toBe('/map/hunting-ponds/');
    expect(caption.querySelector('.editorial-map-marker__caption')?.textContent).toBe(
      '<b>Вход</b>'
    );
    expect(caption.querySelector('b')).toBeFalsy();
    expect(caption.querySelector('.editorial-map-marker__dot')?.textContent).toBe('0');
    expect(markerLocations[markerElements.indexOf(caption)]?.coordinates).toEqual([37.742, 55.058]);
    expect(
      areaFeatures.map(({ props }) => ({ geometry: props.geometry, style: props.style }))
    ).toMatchObject([
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            [37.742, 55.058],
            [37.748, 55.06]
          ]
        },
        style: { stroke: [{ color: '#123456', width: 3, dash: [6, 3] }] }
      },
      {
        geometry: {
          type: 'Polygon',
          coordinates: publicPondsPlace.geometry!.features[2]!.geometry.coordinates
        },
        style: { fill: '#aaccdd', fillOpacity: 0.24, fillRule: 'evenodd' }
      }
    ]);
    expect(areaFeatures.every(({ props }) => !props.onClick && !props.properties)).toBe(true);
    expect(clustererProps[0]?.features).toHaveLength(1);
    expect(mapProps[0]?.location.bounds).toEqual([
      [37.715242, 55.059526],
      [37.717242, 55.061526]
    ]);
    const childCount = map.addChild.mock.calls.length;
    await fireEvent.mouseEnter(link);
    const shown = map.addChild.mock.calls.slice(childCount).map(([child]) => child);
    expect(shown).toHaveLength(3);
    expect(shown).toContain(areaFeatures[0]);
    expect(shown).toContain(areaFeatures[1]);

    await fireEvent.focus(link);
    await fireEvent.mouseLeave(link);
    expect(map.removeChild).not.toHaveBeenCalled();
    await fireEvent.blur(link);
    expect(map.removeChild.mock.calls.map(([child]) => child)).toEqual(shown);
    await fireEvent.focus(link);
    expect(map.addChild.mock.calls.slice(-3).map(([child]) => child)).toEqual(shown);
    await fireEvent.keyDown(link, { key: 'Escape' });
    expect(map.removeChild).toHaveBeenCalledTimes(6);
  });

  it('hides additional geometry when a focused marker becomes a cluster without a blur event', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const listen = vi.spyOn(HTMLAnchorElement.prototype, 'addEventListener');
    const view = render(PlaceMap, { props: { places: [pondsPlace, place] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    await waitFor(() =>
      expect(map.addChild.mock.calls.map(([child]) => child)).toContain(nativeControl)
    );
    const props = clustererProps[0]!;
    const link = markerElements.find(
      (element): element is HTMLAnchorElement =>
        element instanceof HTMLAnchorElement && element.href.endsWith('/hunting-ponds/')
    );
    const canvas = mapElements[0];
    if (!link || !canvas) throw new Error('Place marker is missing');
    canvas.append(link);
    link.focus();
    expect(document.activeElement).toBe(link);
    const objects = map.addChild.mock.calls.slice(-3).map(([object]) => object);
    expect(objects).toHaveLength(3);

    const pondFeature = props.features.find(({ id }) => id === pondsPlace.slug);
    if (!pondFeature) throw new Error('Place feature is missing');
    const renderFeatures = (features: YMapClustererProps['features']): void => {
      props.onRender?.([
        {
          clusterId: features.length === 1 ? String(features[0]!.id) : 'cluster-ponds',
          world: { x: 0, y: 0 },
          lnglat: [37.74, 55.06],
          features
        }
      ]);
    };
    renderFeatures([pondFeature]);
    expect(map.removeChild).not.toHaveBeenCalled();

    props.cluster([37.74, 55.06], props.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker is missing');
    renderFeatures(props.features);
    link.replaceWith(cluster);
    expect(map.removeChild.mock.calls.map(([object]) => object)).toEqual(objects);

    // The clusterer reuses its marker later; visibility requires a new focus/hover event.
    cluster.replaceWith(link);
    renderFeatures([pondFeature]);
    expect(map.addChild.mock.calls.slice(-3).map(([object]) => object)).toEqual(objects);
    expect(map.removeChild).toHaveBeenCalledTimes(3);

    await fireEvent.mouseEnter(link);
    expect(map.addChild.mock.calls.slice(-3).map(([object]) => object)).toEqual(objects);
    renderFeatures(props.features);
    expect(map.removeChild).toHaveBeenCalledTimes(6);

    const options = listen.mock.calls.find(([type]) => type === 'focus')?.[2];
    if (!options || typeof options === 'boolean' || !options.signal)
      throw new Error('Marker event signal is missing');
    expect(options.signal.aborted).toBe(false);
    view.unmount();
    expect(options.signal.aborted).toBe(true);
  });

  it.each([
    ['Enter', false, false],
    [' ', false, false],
    ['Enter', true, false],
    [' ', true, false],
    ['Enter', true, true],
    [' ', true, true]
  ] as const)(
    'keeps focus inside the map when a cluster splits after %s (quick Tab: %s, removed before render: %s)',
    async (key, quickTab, removeBeforeRender) => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      const view = render(PlaceMap, { props: { places: [pondsPlace, place] } });
      await waitFor(() => expect(clustererProps).toHaveLength(1));
      const props = clustererProps[0]!;
      const canvas = mapElements[0];
      if (!canvas) throw new Error('Map canvas missing');

      props.cluster([37.74, 55.06], props.features);
      const cluster = markerElements.at(-1);
      if (!(cluster instanceof HTMLButtonElement)) throw new Error('Cluster button missing');
      canvas.append(cluster);
      cluster.focus();
      await fireEvent.keyDown(cluster, { key });
      cluster.click(); // native keyboard activation dispatches a click with detail 0

      expect(document.activeElement).toBe(canvas);
      if (quickTab) {
        const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        canvas.dispatchEvent(tab);
        expect(tab.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(canvas);
      }
      const update = mapUpdateHandlers[0];
      if (!update) throw new Error('Map update listener missing');
      update({
        type: 'update',
        location: { center: [37.74, 55.06], zoom: 16, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      expect(document.activeElement).toBe(canvas);

      if (removeBeforeRender) cluster.remove();
      props.onRender?.(
        props.features.map((feature) => ({
          clusterId: String(feature.id),
          world: { x: 0, y: 0 },
          lnglat: feature.geometry.coordinates,
          features: [feature]
        }))
      );
      if (!removeBeforeRender) cluster.remove();
      await Promise.resolve();
      expect(canvas.contains(document.activeElement)).toBe(true);

      const firstMarker = markerElements.find(
        (element) =>
          element instanceof HTMLAnchorElement && element.href.endsWith('/hunting-ponds/')
      );
      if (!firstMarker) throw new Error('First place marker missing');
      canvas.append(firstMarker);
      await waitFor(() => expect(document.activeElement).toBe(firstMarker));
      expect(
        map.addChild.mock.calls.filter(([child]) => areaFeatures.includes(child))
      ).toHaveLength(2);
      firstMarker.blur();
      expect(
        map.removeChild.mock.calls.filter(([child]) => areaFeatures.includes(child))
      ).toHaveLength(2);
      view.unmount();
    }
  );

  it.each(['Tab', 'focus'] as const)(
    'preserves another map control reached via %s before a cluster finishes rendering',
    async (move) => {
      const view = render(PlaceMap, { props: { places: [pondsPlace, place] } });
      await waitFor(() => expect(clustererProps).toHaveLength(1));
      const props = clustererProps[0]!;
      const canvas = mapElements[0];
      if (!canvas) throw new Error('Map canvas missing');
      props.cluster([37.74, 55.06], props.features);
      const cluster = markerElements.at(-1);
      if (!(cluster instanceof HTMLButtonElement)) throw new Error('Cluster button missing');
      canvas.append(cluster);
      cluster.focus();
      cluster.click();
      expect(document.activeElement).toBe(canvas);

      const otherControl = document.createElement('button');
      canvas.append(otherControl);
      if (move === 'Tab') {
        await fireEvent.keyDown(canvas, { key: 'Tab' });
        cluster.focus();
        await fireEvent.keyDown(cluster, { key: 'Tab' });
      }
      otherControl.focus();
      props.onRender?.(
        props.features.map((feature) => ({
          clusterId: String(feature.id),
          world: { x: 0, y: 0 },
          lnglat: feature.geometry.coordinates,
          features: [feature]
        }))
      );
      cluster.remove();
      const firstMarker = markerElements.find(
        (element) =>
          element instanceof HTMLAnchorElement && element.href.endsWith('/hunting-ponds/')
      );
      if (!firstMarker) throw new Error('First place marker missing');
      canvas.append(firstMarker);
      await Promise.resolve();
      expect(document.activeElement).toBe(otherControl);
      expect(
        map.addChild.mock.calls.filter(([child]) => areaFeatures.includes(child))
      ).toHaveLength(0);
      view.unmount();
    }
  );

  it.each([false, true])(
    'tracks a cluster through an intermediate render before it splits (quick Tab: %s)',
    async (quickTab) => {
      const view = render(PlaceMap, { props: { places: [pondsPlace, place] } });
      await waitFor(() => expect(clustererProps).toHaveLength(1));
      const props = clustererProps[0]!;
      const canvas = mapElements[0];
      if (!canvas) throw new Error('Map canvas missing');
      props.cluster([37.74, 55.06], props.features);
      const cluster = markerElements.at(-1);
      if (!(cluster instanceof HTMLButtonElement)) throw new Error('Cluster button missing');
      canvas.append(cluster);
      cluster.focus();
      cluster.click();
      if (quickTab) {
        await fireEvent.keyDown(canvas, { key: 'Tab' });
        cluster.focus();
      }

      props.onRender?.([
        {
          clusterId: 'intermediate',
          world: { x: 0, y: 0 },
          lnglat: [37.74, 55.06],
          features: props.features
        }
      ]);
      await waitFor(() => expect(document.activeElement).toBe(cluster));
      props.onRender?.(
        props.features.map((feature) => ({
          clusterId: String(feature.id),
          world: { x: 0, y: 0 },
          lnglat: feature.geometry.coordinates,
          features: [feature]
        }))
      );
      cluster.remove();
      await Promise.resolve();
      expect(canvas.contains(document.activeElement)).toBe(true);
      const firstMarker = markerElements.find(
        (element) =>
          element instanceof HTMLAnchorElement && element.href.endsWith('/hunting-ponds/')
      );
      if (!firstMarker) throw new Error('First place marker missing');
      canvas.append(firstMarker);
      await waitFor(() => expect(document.activeElement).toBe(firstMarker));
      firstMarker.blur();
      expect(
        map.removeChild.mock.calls.filter(([child]) => areaFeatures.includes(child))
      ).toHaveLength(2);
      view.unmount();
    }
  );

  it.each([false, true])(
    'returns focus to a remaining cluster (quick Tab: %s)',
    async (quickTab) => {
      const view = render(PlaceMap, { props: { places: [place, titanicPlace] } });
      await waitFor(() => expect(clustererProps).toHaveLength(1));
      const props = clustererProps[0]!;
      const canvas = mapElements[0];
      const update = mapUpdateHandlers[0];
      if (!canvas || !update) throw new Error('Cluster focus fixtures missing');
      props.cluster([37.74, 55.06], props.features);
      const cluster = markerElements.at(-1);
      if (!(cluster instanceof HTMLButtonElement)) throw new Error('Cluster button missing');
      canvas.append(cluster);
      cluster.focus();
      cluster.click();
      if (quickTab) {
        await fireEvent.keyDown(canvas, { key: 'Tab' });
        cluster.focus();
      }
      update({
        type: 'update',
        location: { center: [37.74, 55.06], zoom: 15, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      expect(document.activeElement).toBe(quickTab ? cluster : canvas);
      const renderedCluster = {
        clusterId: 'still-together',
        world: { x: 0, y: 0 },
        lnglat: [37.74, 55.06] as [number, number],
        features: props.features
      };
      props.onRender?.([renderedCluster]);
      await waitFor(() => expect(document.activeElement).toBe(cluster));

      const otherControl = document.createElement('button');
      canvas.append(otherControl);
      await fireEvent.keyDown(cluster, { key: 'Tab' });
      otherControl.focus();
      canvas.append(document.createElement('span'));
      props.onRender?.([renderedCluster]);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      expect(document.activeElement).toBe(otherControl);
      props.onRender?.(
        props.features.map((feature) => ({
          clusterId: String(feature.id),
          world: { x: 0, y: 0 },
          lnglat: feature.geometry.coordinates,
          features: [feature]
        }))
      );
      cluster.remove();
      const firstMarker = markerElements.find((element) => element instanceof HTMLAnchorElement);
      if (!firstMarker) throw new Error('First place marker missing');
      canvas.append(firstMarker);
      await Promise.resolve();
      expect(document.activeElement).toBe(otherControl);
      view.unmount();
    }
  );

  it('cancels pending cluster focus on pointer interaction or unmount', async () => {
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame');
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');
    const view = render(PlaceMap, { props: { places: [place, titanicPlace] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    const props = clustererProps[0]!;
    const canvas = mapElements[0];
    if (!canvas) throw new Error('Map canvas missing');
    props.cluster([37.74, 55.06], props.features);
    const cluster = markerElements.at(-1);
    if (!(cluster instanceof HTMLButtonElement)) throw new Error('Cluster button missing');
    canvas.append(cluster);
    cluster.focus();
    cluster.click();
    await fireEvent.pointerDown(cluster);
    cluster.focus();
    await fireEvent.click(cluster, { detail: 1 });
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.74, 55.06], zoom: 16, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    props.onRender?.([
      {
        clusterId: String(props.features[0]!.id),
        world: { x: 0, y: 0 },
        lnglat: props.features[0]!.geometry.coordinates,
        features: [props.features[0]!]
      }
    ]);
    const firstMarker = markerElements.find((element) => element instanceof HTMLAnchorElement);
    if (!firstMarker) throw new Error('Place marker missing');
    canvas.append(firstMarker);
    await Promise.resolve();
    expect(document.activeElement).toBe(cluster);

    cluster.focus();
    cluster.click();
    props.onRender?.([
      {
        clusterId: 'still-together',
        world: { x: 0, y: 0 },
        lnglat: [37.74, 55.06],
        features: props.features
      }
    ]);
    const frame = requestFrame.mock.results.at(-1)?.value;
    view.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(frame);
    document.body.append(firstMarker);
    await Promise.resolve();
    expect(document.activeElement).not.toBe(firstMarker);
    firstMarker.remove();
  });

  it('temporarily reveals every extra object via URL on touch and removes the group on expiry', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=hunting-ponds');
    const timeout = vi.spyOn(window, 'setTimeout');
    render(PlaceMap, { props: { places: [pondsPlace] } });
    await waitFor(() =>
      expect(map.addChild.mock.calls.some(([child]) => child === areaFeatures[0])).toBe(true)
    );
    const shown = map.addChild.mock.calls.filter(([child]) => areaFeatures.includes(child));
    expect(shown).toHaveLength(2);
    expect(clustererProps[0]?.features).toHaveLength(1);
    const index = timeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
    const expire = timeout.mock.calls[index]?.[0];
    const timer = timeout.mock.results[index]?.value;
    if (typeof expire !== 'function') throw new Error('Place highlight timer is missing');
    window.clearTimeout(timer);
    expire();
    expect(map.removeChild).toHaveBeenCalledTimes(3);
    expect(areaFeatures.map(({ props }) => props.style?.stroke?.[0]?.color)).toEqual([
      '#123456',
      '#456789'
    ]);
  });

  it('shows the place fallback when JSON cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{', { status: 200 }))
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { dataUrl: '/map/data/places.json', fallbackPlace: place } });
    await screen.findByRole('status');
    expect(markerElements).toHaveLength(0);
    expect(screen.getByRole('link').getAttribute('href')).toBe(place.url);
  });

  it.each(['titanik', 'green-dreams'])(
    'removes unpublished highlight %s without changing the map view',
    async (slug) => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      const historyState = { navigation: 'map' };
      window.history.replaceState(historyState, '', `/map/?h=${slug}&from=issue#map`);
      const replaceState = vi.spyOn(window.history, 'replaceState');

      render(PlaceMap, { props: { places: [place, titanicPlace] } });

      await waitFor(() => expect(markerElements).toHaveLength(2));

      expect({
        focused: map.update.mock.calls.some(([update]) => Boolean(update.location?.center)),
        highlights: markerElements.map((marker) => marker.dataset.highlighted),
        replaceState: replaceState.mock.lastCall,
        url: `${window.location.pathname}${window.location.search}${window.location.hash}`
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
          "/map/?from=issue#map",
        ],
        "url": "/map/?from=issue#map",
      }
    `);
    }
  );

  it('cancels the place highlight timer when the map unmounts', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    window.history.replaceState({}, '', '/map/?h=burzhuyka');
    const setTimeout = vi.spyOn(window, 'setTimeout');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const view = render(PlaceMap, { props: { places: [place] } });

    await waitFor(() =>
      expect(setTimeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(true)
    );

    const timerIndex = setTimeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
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
      ariaLabel: marker?.getAttribute('aria-label')
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Буржуйка», сейчас закрыто",
        "open": "false",
        "title": "Буржуйка
      сейчас закрыто",
      }
    `);

    const timerIndex = setInterval.mock.calls.findIndex(([, delay]) => delay === 60_000);
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
      ariaLabel: marker?.getAttribute('aria-label')
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

  it('applies marker scale updates from the map listener', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));

    const mapElement = mapElements[0];
    const update = mapUpdateHandlers[0];

    if (!mapElement || !update) throw new Error('map update listener is missing');

    update({
      type: 'update',
      location: {
        center: [37.74, 55.06],
        zoom: 17,
        bounds: [
          [37.7, 55.04],
          [37.77, 55.08]
        ]
      },
      camera: {},
      mapInAction: false
    });

    expect(mapElement.style.getPropertyValue('--place-map-marker-scale')).toBe('1.150');
  });

  it('loads parcel geometry only when switched on, reuses it after switching off and keeps places', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    expect(parcelFetch).not.toHaveBeenCalled();

    const layers = screen.getByRole('button', { name: 'Слои' });
    expect(layers.textContent?.trim()).toBe('');
    expect(layers.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    await fireEvent.click(layers);
    expect(parcelFetch).not.toHaveBeenCalled();
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    expect(screen.getByRole('checkbox', { name: 'Участки' })).toBeDefined();
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.checked).toBe(false);
    await fireEvent.click(toggle);
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    expect(mapProps[0]?.location.bounds).toEqual([
      [37.715242, 55.059526],
      [37.717242, 55.061526]
    ]);

    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    expect(toggle.checked).toBe(true);
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(toggle);
    expect(map.removeChild).toHaveBeenCalledWith(feature);
    await fireEvent.click(toggle);
    expect(parcelFetch).toHaveBeenCalledTimes(1);
    expect(markerElements[0]?.getAttribute('href')).toBe(place.url);
    expect(map.addChild).toHaveBeenCalledWith(nativeControl);
  });

  it('lets each part finish independently and keeps neighbouring contours when one is hidden', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const park = { ...parcel, code: 'SHP-B42', aliases: [], part: 'shp' };
    const forestResponse = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.endsWith('/shf.json') ? forestResponse.promise : Promise.resolve(Response.json([park]))
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    const parkToggle = screen.getByRole('checkbox', { name: 'Парк' }) as HTMLInputElement;
    expect(screen.getAllByRole('checkbox').map((input) => input.parentElement?.textContent?.trim()))
      .toMatchInlineSnapshot(`
        [
          "Участки",
          "Форест",
          "Вилладж",
          "Парк",
          "Ривер",
        ]
      `);
    expect(all.indeterminate).toBe(false);
    await fireEvent.click(forestToggle);
    await fireEvent.click(parkToggle);
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHP-B42')).toBe(true)
    );
    expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHF-M1')).toBe(false);
    expect(all.indeterminate).toBe(true);
    const parkFeature = areaFeatures.find(({ props }) => props.id === 'parcel-SHP-B42');
    await fireEvent.click(parkToggle);
    expect(map.removeChild).toHaveBeenCalledWith(parkFeature);
    forestResponse.resolve(Response.json([forest]));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHF-M1')).toBe(true)
    );
    const forestFeature = areaFeatures.find(({ props }) => props.id === 'parcel-SHF-M1');
    expect(map.removeChild).not.toHaveBeenCalledWith(forestFeature);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shp.json'
    ]);
    await fireEvent.click(all);
    await waitFor(() => expect(all.checked).toBe(true));
    await fireEvent.click(all);
    expect(all.checked).toBe(false);
    expect(forestToggle.checked).toBe(false);
    expect(map.removeChild).toHaveBeenCalledWith(forestFeature);
  });

  it('keeps all four parts in one layer when their requests finish together', async () => {
    const codes = { shf: 'SHF-M1', shv: 'SHV-V1', shp: 'SHP-B42', shr: 'SHR-L43' } as const;
    const fetch = vi.fn(async (url: string) => {
      const part = url.match(/\/(shf|shv|shp|shr)\.json$/)?.[1] as keyof typeof codes;
      return Response.json([{ ...parcel, code: codes[part], aliases: [], part }]);
    });
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    await fireEvent.click(all);
    await waitFor(() => expect(areaFeatures).toHaveLength(4));
    expect(fetch).toHaveBeenCalledTimes(4);
    await fireEvent.click(all);
    for (const feature of areaFeatures) expect(map.removeChild).toHaveBeenCalledWith(feature);
  });

  it('renders the four decorative area icons and toggles every checkbox with its label', async () => {
    const icons = Object.fromEntries(
      ['forest', 'village', 'park', 'river'].map((name) => [
        name,
        createRawSnippet(() => ({ render: () => `<svg data-area="${name}"></svg>` }))
      ])
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place], ...icons } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const all = checkboxes[0]!;
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([
      false,
      false,
      false,
      false,
      false
    ]);
    expect(checkboxes.map((checkbox) => checkbox.parentElement?.textContent?.trim()))
      .toMatchInlineSnapshot(`
        [
          "Участки",
          "Форест",
          "Вилладж",
          "Парк",
          "Ривер",
        ]
      `);
    expect(
      checkboxes.slice(1).map((checkbox) => ({
        icon: checkbox.parentElement?.querySelector('svg')?.getAttribute('data-area'),
        decorative: checkbox.parentElement
          ?.querySelector('[aria-hidden]')
          ?.getAttribute('aria-hidden')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "decorative": "true",
          "icon": "forest",
        },
        {
          "decorative": "true",
          "icon": "village",
        },
        {
          "decorative": "true",
          "icon": "park",
        },
        {
          "decorative": "true",
          "icon": "river",
        },
      ]
    `);
    for (const checkbox of checkboxes.slice(1)) {
      await fireEvent.click(checkbox.parentElement!);
      expect(checkbox.checked).toBe(true);
    }
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    await fireEvent.click(all.parentElement!);
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([
      false,
      false,
      false,
      false,
      false
    ]);
    expect(screen.getByRole('button', { name: 'Слои' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a non-numeric selection marker on the layers trigger while any part is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    const marker = (): HTMLSpanElement | undefined =>
      layers.querySelector<HTMLSpanElement>('span[aria-hidden="true"]') ?? undefined;
    expect(marker()).toBeUndefined();
    await fireEvent.click(layers);
    const forest = screen.getByRole('checkbox', { name: 'Форест' });
    const park = screen.getByRole('checkbox', { name: 'Парк' });
    await fireEvent.click(forest);
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(layers);
    await fireEvent.click(park);
    await fireEvent.click(forest);
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(marker()).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Слои' })).toBe(layers);
  });

  it('exposes the mixed checkbox state and keeps keyboard selection and camera', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    const forest = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    forest.focus();
    await fireEvent.keyDown(forest, { key: ' ' });
    await fireEvent.click(forest, { detail: 0 }); // Native checkbox keyboard activation
    expect(document.activeElement).toBe(forest);
    expect(forest.checked).toBe(true);
    expect(all.indeterminate).toBe(true);
    const cameraUpdates = map.update.mock.calls.length;
    await fireEvent.click(all);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(map.update).toHaveBeenCalledTimes(cameraUpdates);
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(layers);
  });

  it('selects a parcel across parts without replacing either part or moving the camera', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shf.json') ? [forest] : [parcel]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Форест' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    const first = areaFeatures.find(({ props }) => props.id === 'parcel-SHF-M1');
    const second = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    const calls = map.update.mock.calls.length;
    first?.props.onClick?.(new MouseEvent('click'), {} as never);
    second?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(first?.update.mock.lastCall?.[0].style).toEqual(first?.props.style);
    expect(second?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    expect(map.update.mock.calls).toHaveLength(calls);
    expect(map.removeChild).not.toHaveBeenCalledWith(first);
  });

  it('closes the layer list outside and on Escape, returning keyboard focus', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));

    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    toggle.focus();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(layers);

    await fireEvent.click(layers);
    await fireEvent.pointerDown(document.body);
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(parcelFetch).not.toHaveBeenCalled();
  });

  it('ignores a parcel response after the part is disabled or the component unmounts', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(toggle.checked).toBe(false));
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();

    const later = Promise.withResolvers<Response>();
    fetch.mockReturnValue(later.promise);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Парк' }));
    view.unmount();
    later.resolve(Response.json([parcel]));
    await Promise.resolve();
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();
  });

  it('reuses one in-flight request when a part is turned off and on before its response', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    expect(fetch).toHaveBeenCalledOnce();
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(toggle.checked).toBe(true);
  });

  it('offers a retry after a failed manual request', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockResolvedValueOnce(Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await screen.findByRole('alert');
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
    ).toBeNull();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports one part failure without hiding a ready part, then retries through its checkbox', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () => Response.json([forest]))
      .mockImplementationOnce(async () => new Response(undefined, { status: 503 }))
      .mockImplementationOnce(async () => Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    const riverToggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(forestToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.click(riverToggle);
    expect((await screen.findByRole('alert')).textContent).toContain('Ривер');
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
        ?.textContent
    ).toBe('✓');
    expect(forestToggle.checked).toBe(true);
    expect(riverToggle.checked).toBe(false);
    expect(riverToggle.getAttribute('aria-invalid')).toBe('true');
    expect(riverToggle.getAttribute('aria-describedby')).toBe('parcel-map-error-shr');
    expect(riverToggle.parentElement?.textContent).toContain('!');
    expect(screen.queryByText(/Загружаем участки|Повторить/)).toBeNull();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alert').textContent).toContain('Ривер');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(riverToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rolls back partially added objects when applying one part fails', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const second = { ...parcel, code: 'SHF-M2', aliases: [], part: 'shf' };
    const fetch = vi.fn(async (url: string) =>
      Response.json(url.endsWith('shf.json') ? [forest, second] : [parcel])
    );
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    const ready = areaFeatures[0];
    map.addChild
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('SDK failed to add feature');
      });
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    await fireEvent.click(forestToggle);
    await screen.findByRole('alert');
    expect(forestToggle.checked).toBe(false);
    expect(map.removeChild).toHaveBeenCalledWith(areaFeatures[1]);
    expect(map.removeChild).toHaveBeenCalledWith(areaFeatures[2]);
    expect(map.removeChild).not.toHaveBeenCalledWith(ready);
    await fireEvent.click(forestToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(5));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shf.json'
    ]);
  });

  it.each([
    parcel.geometry,
    { type: 'MultiPolygon', coordinates: [parcelContours[0], parcelContours[2]] }
  ])(
    'shows only the primary label from zoom 17 for one cadastral $type with an alias',
    async (geometry) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json([{ ...parcel, geometry }]))
      );
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
      await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
      await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
      await waitFor(() => expect(areaFeatures).toHaveLength(1));
      const update = mapUpdateHandlers[0];
      if (!update) throw new Error('Map listener missing');
      expect(markerElements.some((element) => element.classList.contains('parcel-map-label'))).toBe(
        false
      );
      update({
        type: 'update',
        location: {
          center: [37.715, 55.065],
          zoom: 17,
          bounds: [
            [37.7, 55.08],
            [37.8, 55.04]
          ]
        },
        camera: {},
        mapInAction: false
      });
      const label = markerElements.find((element) =>
        element.classList.contains('parcel-map-label')
      );
      if (!label) throw new Error('Parcel label missing');
      expect({
        text: label.textContent,
        title: label.title,
        name: label.getAttribute('aria-label')
      }).toMatchInlineSnapshot(`
        {
          "name": "Выбрать участок SHR-L43",
          "text": "L43",
          "title": "SHR-L43",
        }
      `);
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(1);
      expect(areaFeatures[0]?.props.geometry).toEqual(geometry);
      const labelIndex = markerElements.indexOf(label);
      const labelCoordinates = markerLocations[labelIndex]?.coordinates;
      expect(labelCoordinates).toEqual([37.715, 55.065]);
      const labelMarker = map.addChild.mock.lastCall?.[0];
      await fireEvent.click(label);
      expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
        fill: parcelSelectionColor
      });
      expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();

      update({
        type: 'update',
        location: { center: [37.715, 55.065], zoom: 16, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      expect(map.removeChild).toHaveBeenCalledWith(labelMarker);
    }
  );

  it('selects both contours without extra text for a compound position', async () => {
    const group = {
      ...parcel,
      code: 'SHR-E35',
      aliases: [],
      multipleCadastralParcels: true,
      geometry: {
        type: 'MultiPolygon',
        coordinates: parcelContours.slice(0, 2)
      }
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([group, parcel]))
    );
    window.history.replaceState({}, '', '/map/?p=SHR-E35');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-E35');
    expect(feature?.props.geometry).toMatchObject({
      type: 'MultiPolygon',
      coordinates: parcelContours.slice(0, 2)
    });
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    const markersBeforeSelection = markerElements.length;
    feature?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(markerElements).toHaveLength(markersBeforeSelection);
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });

    expect(window.location.search).toBe('?p=SHR-E35');
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find(
      (element) => element.classList.contains('parcel-map-label') && element.title === 'SHR-E35'
    );
    if (!label) throw new Error('group label missing');
    expect({
      text: label.textContent,
      title: label.title,
      name: label.getAttribute('aria-label')
    }).toMatchInlineSnapshot(`
      {
        "name": "Выбрать участок SHR-E35",
        "text": "E35",
        "title": "SHR-E35",
      }
    `);
    await fireEvent.click(label);
    expect(markerElements.every((element) => !element.classList.contains('parcel-map-hint'))).toBe(
      true
    );
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    const single = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    single?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(single?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    expect(feature?.update.mock.lastCall?.[0].style).toEqual(feature?.props.style);
  });

  it.each([
    ['shr-k40', 'SHR-K41'],
    ['shr-k2', 'SHR-K19'],
    ['shr-k10', 'SHR-K19']
  ])(
    'labels two-to-three and three-to-three groups and selects the whole group via alias %s',
    async (alias, code) => {
      const groups = [
        { ...parcel, code: 'SHR-K41', aliases: ['SHR-K40'] },
        { ...parcel, code: 'SHR-K19', aliases: ['SHR-K10', 'SHR-K2'] }
      ].map((item) => ({
        ...item,
        multipleCadastralParcels: true,
        geometry: { type: 'MultiPolygon', coordinates: parcelContours }
      }));
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(groups))
      );
      window.history.replaceState({}, '', `/map/?p=${alias}`);
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(areaFeatures).toHaveLength(2));
      const selected = areaFeatures.find(({ props }) => props.id === `parcel-${code}`);
      expect(selected?.update.mock.lastCall?.[0].style).toMatchObject({
        fill: parcelSelectionColor
      });
      expect(window.location.search).toBe(`?p=${code}`);
      expect(map.update.mock.lastCall?.[0].location).toMatchObject({
        center: parcel.labelCoordinates,
        zoom: 17
      });
      expect(areaFeatures.map(({ props }) => props.geometry)).toEqual(
        groups.map(({ geometry }) => geometry)
      );
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(0);

      const update = mapUpdateHandlers[0];
      const canvas = mapElements[0];
      if (!update || !canvas) throw new Error('Map missing');
      map.zoom = 17;
      update({
        type: 'update',
        location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      const labels = markerElements.filter((element) =>
        element.classList.contains('parcel-map-label')
      );
      expect(
        labels.map((label) => ({
          tag: label.tagName,
          text: label.textContent,
          title: label.title,
          name: label.getAttribute('aria-label')
        }))
      ).toMatchInlineSnapshot(`
        [
          {
            "name": "Выбрать участок SHR-K41 / SHR-K40",
            "tag": "BUTTON",
            "text": "K41/K40",
            "title": "SHR-K41 / SHR-K40",
          },
          {
            "name": "Выбрать участок SHR-K19 / SHR-K2 / SHR-K10",
            "tag": "BUTTON",
            "text": "K19/K2/K10",
            "title": "SHR-K19 / SHR-K2 / SHR-K10",
          },
        ]
      `);
      canvas.append(...labels);
      map.update.mockClear();
      for (const [index, group] of groups.entries()) {
        await fireEvent.keyDown(document, { key: 'Escape' });
        const label = labels[index];
        const feature = areaFeatures[index];
        if (!label || !feature) throw new Error('Group missing');
        label.focus();
        await fireEvent.click(label, { detail: 0 });
        expect(document.activeElement).toBe(label);
        expect(window.location.search).toBe(`?p=${group.code}`);
        expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
          fill: parcelSelectionColor
        });

        await fireEvent.keyDown(label, { key: 'Escape' });
        expect(feature.update.mock.lastCall?.[0].style).toEqual(feature.props.style);
        feature.props.onClick?.(new MouseEvent('click'), {} as never);
        expect(window.location.search).toBe(`?p=${group.code}`);
        expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
          fill: parcelSelectionColor
        });
      }
      expect(map.update).not.toHaveBeenCalled();
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(2);
    }
  );

  it('shades known sale statuses only while restoring each parcel after selection', async () => {
    const parcels = (['available', 'reserved', 'unavailable', 'sold', undefined] as const).map(
      (status, index) => ({
        ...parcel,
        code: `SHR-L${43 + index}`,
        status,
        labelCoordinates: [37.715 + index * 0.001, 55.065]
      })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(parcels))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(5));

    expect(
      areaFeatures.map(({ props }) => ({
        id: props.id,
        fill: props.style?.fill,
        opacity: props.style?.fillOpacity
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "fill": "#d6a22a",
          "id": "parcel-SHR-L43",
          "opacity": 0.22,
        },
        {
          "fill": "#d6a22a",
          "id": "parcel-SHR-L44",
          "opacity": 0.22,
        },
        {
          "fill": "oklch(88% 0 0)",
          "id": "parcel-SHR-L45",
          "opacity": 0.25,
        },
        {
          "fill": undefined,
          "id": "parcel-SHR-L46",
          "opacity": 0,
        },
        {
          "fill": undefined,
          "id": "parcel-SHR-L47",
          "opacity": 0,
        },
      ]
    `);
    expect(
      markerElements.filter((element) => element.classList.contains('parcel-map-label'))
    ).toHaveLength(0);
    expect(markerElements[0]?.getAttribute('href')).toBe(place.url);

    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const unavailable = markerElements.find((element) => element.title === 'SHR-L45');
    const available = markerElements.find((element) => element.title === 'SHR-L43');
    if (!unavailable || !available) throw new Error('Parcel labels missing');
    expect(unavailable.classList.contains('parcel-map-label--unavailable')).toBe(true);
    expect(unavailable.getAttribute('aria-label')).toBe('Выбрать участок SHR-L45');
    expect(available.classList.contains('parcel-map-label--unavailable')).toBe(false);
    expect(areaFeatures[2]?.props.style?.stroke?.[0]?.opacity).toBe(0.2);

    await fireEvent.click(unavailable);
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
    await fireEvent.click(available);
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toEqual(areaFeatures[2]?.props.style);
    for (const feature of areaFeatures) {
      feature.props.onClick?.(new MouseEvent('click'), {} as never);
      const selectedStyle = feature.update.mock.lastCall?.[0].style;
      expect(selectedStyle).toMatchObject({
        fill: parcelSelectionColor,
        stroke: [{ color: parcelSelectionColor }]
      });
      expect(selectedStyle?.stroke[0].width).toBeGreaterThan(
        feature.props.style?.stroke?.[0]?.width ?? 0
      );
      expect(feature.update.mock.lastCall?.[0].style).toEqual(selectedStyle);
      await fireEvent.pointerDown(mapElements[0]!);
      mapClickHandlers[0]?.();
      expect(feature.update.mock.lastCall?.[0].style).toEqual(feature.props.style);
    }
  });

  it('replaces permanent parcel selection and clears it on Escape', async () => {
    const secondParcel = {
      code: 'SHR-L46',
      part: parcel.part,
      geometry: parcel.geometry,
      labelCoordinates: [37.73, 55.065]
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([parcel, secondParcel]))
    );
    const timeout = vi.spyOn(window, 'setTimeout');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(areaFeatures.map(({ props }) => props.style?.stroke)).toMatchInlineSnapshot(`
      [
        [
          {
            "color": "#64748b",
            "opacity": 0.5,
            "width": 1,
          },
        ],
        [
          {
            "color": "#64748b",
            "opacity": 0.5,
            "width": 1,
          },
        ],
      ]
    `);
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });

    const firstLabel = markerElements.find((element) => element.title === parcel.code);
    const secondLabel = markerElements.find((element) => element.title === secondParcel.code);
    if (!firstLabel || !secondLabel) throw new Error('Parcel labels missing');
    await fireEvent.click(firstLabel);
    await fireEvent.click(secondLabel);
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(timeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(false);
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#64748b', width: 1, opacity: 0.5 }]
    });
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Слои' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#64748b', width: 1, opacity: 0.5 }]
    });
    expect(window.location.search).toBe('');
    view.unmount();
  });

  it('focuses alias links from the geometry feed, survives resize, and preserves URL state', async () => {
    const fetch = vi.fn((url: string) =>
      url === '/map/data/parcels/shr.json'
        ? Promise.resolve(
            Response.json([
              {
                ...parcel,
                geometry: {
                  type: 'MultiPolygon',
                  coordinates: [
                    parcel.geometry.coordinates,
                    [
                      [
                        [37.8, 55.08],
                        [37.81, 55.08],
                        [37.81, 55.09],
                        [37.8, 55.08]
                      ]
                    ]
                  ]
                }
              }
            ])
          )
        : parcelFetch(url)
    );
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') }));
    const historyState = { navigation: 'parcel' };
    window.history.replaceState(historyState, '', '/map/?q=a%20b&flag&p=shr-l44&h=burzhuyka#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() =>
      expect(
        areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')?.update
      ).toHaveBeenCalled()
    );
    expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
        ?.textContent
    ).toBe('✓');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    expect(map.update.mock.calls.find(([props]) => props.location?.zoom === 17)?.[0])
      .toMatchInlineSnapshot(`
        {
          "location": {
            "center": [
              37.715,
              55.065,
            ],
            "duration": 0,
            "easing": "ease-in-out",
            "zoom": 17,
          },
        }
      `);
    expect(markerElements[0]?.dataset.highlighted).toBeUndefined();

    const count = map.update.mock.calls.length;
    document.dispatchEvent(new Event('astro:page-load'));
    await waitFor(() => expect(map.update.mock.calls.length).toBe(count));

    expect(window.location.search).toBe('?q=a%20b&flag&h=burzhuyka&p=SHR-L43');
    await fireEvent.keyDown(document, { key: 'Escape' });
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(replace.mock.lastCall).toEqual([historyState, '', '/map/?q=a%20b&flag&h=burzhuyka#map']);
    document.dispatchEvent(new Event('astro:page-load'));
    expect(map.update.mock.calls.length).toBe(count);
  });

  it('clears the direct link after selecting a different parcel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          parcel,
          { ...parcel, code: 'SHR-L46', aliases: [], labelCoordinates: [37.73, 55.065] }
        ])
      )
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find((element) => element.title === 'SHR-L46');
    if (!label) throw new Error('Second parcel label missing');
    await fireEvent.click(label);

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/map/?flag&p=SHR-L46#map'
    );
  });

  it('does not focus a late direct-link response after another selection', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('shf.json') ? pending.promise : Promise.resolve(Response.json([parcel]))
      )
    );
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Слои' }) as HTMLButtonElement).disabled).toBe(
        false
      )
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);

    expect(window.location.search).toBe('?flag&p=SHR-L43');

    pending.resolve(Response.json([forest]));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
    expect(window.location.search).toBe('?flag&p=SHR-L43');
  });

  it('cancels a pending direct link on a blank map click', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/map/data/parcels/shr.json'));

    mapClickHandlers[0]?.(undefined);
    expect(window.location.search).toBe('?flag');

    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(areaFeatures[0]?.update).not.toHaveBeenCalled();
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
  });

  it('clears a direct link when the replacement selection is disabled', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shf.json') ? [forest] : [parcel]))
    );
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await fireEvent.click(river);

    expect(window.location.search).toBe('?flag');
    expect(map.removeChild).not.toHaveBeenCalledWith(areaFeatures[0]);
  });

  it('uses the label zoom for a direct link to a small parcel', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.find(([props]) => props.location?.zoom === 17)?.[0]).toMatchObject(
      {
        location: { center: parcel.labelCoordinates, zoom: 17 }
      }
    );
  });

  it('does not restart an active direct-link focus when selecting all parts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shr.json') ? [parcel] : []))
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&other=1');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(map.update.mock.calls.filter(([update]) => update.location?.zoom === 17)).toHaveLength(
      1
    );
    expect(window.location.search).toBe('?p=SHR-L43&other=1');
  });

  it('repeats an original parcel link on remount but opens the cleaned URL with no parts', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    const original = '/map/?q=a%20b&flag&p=SHR-L43#map';
    window.history.replaceState({}, '', original);
    const first = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.keyDown(document, { key: 'Escape' });
    const cleaned = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    expect(cleaned).toBe('/map/?q=a%20b&flag#map');
    first.unmount();

    window.history.replaceState({}, '', original);
    const second = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(parcelFetch).toHaveBeenCalledTimes(2);
    second.unmount();

    window.history.replaceState({}, '', cleaned);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(3));
    expect(parcelFetch).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      false
    );
  });

  it('routes a mixed-case alias through only its part and ignores malformed codes', async () => {
    const park = { ...parcel, code: 'SHP-B42', aliases: ['SHP-B43'], part: 'shp' };
    const fetch = vi.fn(async (_url: string) => Response.json([park]));
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=shp-b43');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shp.json']);
    expect(areaFeatures[0]?.props.id).toBe('parcel-SHP-B42');
    view.unmount();

    fetch.mockClear();
    window.history.replaceState({}, '', '/map/?p=SHF-wrong');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(2));
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels an in-flight direct link when its part is switched off', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await fireEvent.click(toggle);
    expect(`${window.location.search}${window.location.hash}`).toBe('?flag#map');
    pending.resolve(Response.json([forest]));
    await Promise.resolve();
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch).toHaveBeenCalledOnce();
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(false);
  });

  it('cancels a pending parcel link when selecting a place', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    const selected = markerElements[0];
    if (!selected) throw new Error('Map marker missing');
    await fireEvent.click(selected);
    expect(new URL(window.location.href).searchParams.has('p')).toBe(false);
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(false);
  });

  it('keeps a pending parcel link when zooming into a place cluster', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place, titanicPlace] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    const clusterer = clustererProps[0]!;
    clusterer.cluster([37.74, 55.06], clusterer.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker missing');
    await fireEvent.click(cluster);
    expect(window.location.search).toBe('?p=SHR-L43&flag');

    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(true);
  });

  it('cancels an active URL highlight without a late focus or URL mutation', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    const historyState = { navigation: 'parcel' };
    window.history.replaceState(historyState, '', '/map/?p=SHR-L43&flag#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    expect(replace.mock.lastCall).toEqual([historyState, '', '/map/?flag#map']);
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(map.update.mock.calls.filter(([update]) => update.location?.zoom === 17)).toHaveLength(
      1
    );
    expect(parcelFetch).toHaveBeenCalledOnce();
  });

  it('discards an unknown link after loading geometry without changing layer visibility', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      false
    );
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(parcelFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps a direct-link intent after a failed geometry request and retries it', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L44&from=search');
    render(PlaceMap, { props: { places: [place] } });

    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L44&from=search');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shr.json'
    ]);
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
  });

  it('keeps a requested link when applying its part fails, then focuses after a retry', async () => {
    const fetch = vi.fn(async () => Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L44&other=1#map');
    map.update.mockImplementationOnce(() => {
      throw new Error('SDK focus unavailable');
    });
    render(PlaceMap, { props: { places: [place] } });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ривер');
    expect(window.location.search).toBe('?p=SHR-L44&other=1');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    expect(river.checked).toBe(false);
    await fireEvent.click(river);
    await waitFor(() =>
      expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true)
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(window.location.search).toBe('?other=1&p=SHR-L43');
  });

  it('preserves an explicit group selection if a pending direct code turns out unknown', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.endsWith('/shr.json') ? pending.promise : Promise.resolve(Response.json([]))
    );
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shv.json',
      '/map/data/parcels/shp.json'
    ]);
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
  });

  it('retries after an invalid wrapper causes an application error', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ parcels: [] }))
      .mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });

    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shr.json'
    ]);
  });

  it('retries a failed JSON response without caching it', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{')).mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('opens a permanent popup with the last price and exact area only for sale statuses', async () => {
    const reserved = { ...parcel, code: 'SHR-L45', status: 'reserved' as const };
    const sold = { ...parcel, code: 'SHR-L46', status: 'sold' as const };
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/details/SHR-L43.json')) return Response.json(details);
      if (url.endsWith('/details/SHR-L45.json'))
        return Response.json({
          ...details,
          code: reserved.code,
          status: 'reserved',
          price: { history: [] }
        });
      return Response.json([{ ...parcel, status: 'available' }, reserved, sold]);
    });
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(3));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    expect(screen.getByText(/10,51 сот\./)).toBeDefined();
    expect(screen.queryByTitle('Забронирован')).toBeNull();
    expect(window.location.search).toBe('?p=SHR-L43');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/details/SHR-L43.json'
    ]);

    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() => expect(screen.getByText('Нет данных о цене')).toBeDefined());
    expect(screen.getByTitle('Забронирован').getAttribute('aria-label')).toBe('Забронирован');
    areaFeatures[2]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('opens a direct alias popup without stealing focus or adding a history entry', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('/details/')
        ? Response.json(details)
        : Response.json([{ ...parcel, status: 'available' }])
    );
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') }));
    const state = { navigation: 'search' };
    window.history.replaceState(state, '', '/map/?q=a%20b&flag&p=shr-l44#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    const push = vi.spyOn(window.history, 'pushState');
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('group', { name: 'Участок SHR-L43' });
    expect(document.activeElement).toBe(outside);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/details/SHR-L43.json'
    ]);
    expect(replace.mock.lastCall).toEqual([state, '', '/map/?q=a%20b&flag&p=SHR-L43#map']);
    expect(
      map.update.mock.calls.find(([update]) => update.location?.zoom === 17)?.[0].location?.duration
    ).toBe(0);
    expect(push).not.toHaveBeenCalled();
    outside.remove();
  });

  it('announces missing values and retries HTTP and malformed JSON without losing selection', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([{ ...parcel, status: 'available' }]))
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockResolvedValueOnce(new Response('{'))
      .mockResolvedValueOnce(
        Response.json({ ...details, area: undefined, price: { history: [] } })
      );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.getByText('Нет данных о площади')).toBeDefined());
    expect(screen.getByText('Нет данных о цене')).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects malformed numeric details and retries instead of caching them', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('/details/')
        ? Response.json(
            fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 1
              ? { ...details, area: 'bad' }
              : fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 2
                ? { ...details, price: { ...details.price, last: 'bad' } }
                : details
          )
        : Response.json([{ ...parcel, status: 'available' }])
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('reuses in-flight and successful details and ignores a late answer after closing', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.includes('/details/')
        ? pending.promise
        : Promise.resolve(Response.json([{ ...parcel, status: 'available' }]))
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    await fireEvent.click(screen.getByRole('button', { name: 'Закрыть сведения об участке' }));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(fetch).toHaveBeenCalledTimes(2);
    pending.resolve(Response.json(details));
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    await fireEvent.click(screen.getByRole('button', { name: 'Закрыть сведения об участке' }));
    expect(window.location.search).toBe('');
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(fetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
  });

  it('does not restore a superseded popup when its details arrive late', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('/details/')
          ? pending.promise
          : Promise.resolve(
              Response.json([
                { ...parcel, status: 'available' },
                { ...parcel, code: 'SHR-L46', aliases: [], status: 'sold' }
              ])
            )
      )
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    pending.resolve(Response.json(details));
    await Promise.resolve();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
  });

  it('ignores details arriving after the layer is disabled or the map unmounts', async () => {
    const first = Promise.withResolvers<Response>();
    const second = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.includes('/details/')
        ? fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 1
          ? first.promise
          : second.promise
        : Promise.resolve(Response.json([{ ...parcel, status: 'available' }]))
    );
    vi.stubGlobal('fetch', fetch);
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    await fireEvent.click(river);
    expect(window.location.search).toBe('');
    first.reject(new Error('Stale details request'));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    view.unmount();
    second.resolve(Response.json(details));
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull();
  });

  it('keeps the selection on drag and zoom but closes on a completed blank click', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    const canvas = mapElements[0]!;
    await fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    await fireEvent.pointerMove(canvas, { clientX: 90, clientY: 20 });
    mapClickHandlers[0]?.();
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.72, 55.07], zoom: 16, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    mapClickHandlers[0]?.();
    expect(window.location.search).toBe('');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
  });

  it('keeps the selected parcel and its link while zooming into a place cluster', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place, titanicPlace] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);

    const clusters = clustererProps[0]!;
    clusters.cluster([37.74, 55.06], clusters.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker missing');
    await fireEvent.click(cluster);

    expect(map.update.mock.lastCall?.[0].location.bounds).toBeDefined();
    expect(window.location.search).toBe('?p=SHR-L43');
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
  });

  it('moves keyboard focus into the popup and returns it to the label or map', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find((element) => element.title === parcel.code);
    const canvas = mapElements[0];
    if (!label || !canvas) throw new Error('Parcel label missing');
    canvas.append(label);
    label.focus();
    await fireEvent.click(label, { detail: 0 });
    const close = await screen.findByRole('button', { name: 'Закрыть сведения об участке' });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(close.closest('[aria-modal]')).toBeNull();
    expect(close.getAttribute('tabindex')).toBeNull();
    await fireEvent.keyDown(close, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    await fireEvent.click(close);
    expect(document.activeElement).toBe(label);

    await fireEvent.click(label, { detail: 0 });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Закрыть сведения об участке' })
      )
    );
    label.remove();
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(canvas);
    expect(window.location.search).toBe('');
  });

  it('keeps the parcel selected while Escape closes layers or a separate dialog', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    river.focus();
    await fireEvent.keyDown(river, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(window.location.search).toBe('?p=SHR-L43');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;
    document.body.append(dialog);
    dialog.focus();
    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(window.location.search).toBe('?p=SHR-L43');
    dialog.remove();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(window.location.search).toBe('');
  });

  it('handles body Escape after a direct link without intercepting external controls', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('button', { name: 'Закрыть сведения об участке' });

    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    await fireEvent.keyDown(outside, { key: 'Escape' });
    expect(window.location.search).toBe('?p=SHR-L43');
    outside.remove();

    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(window.location.search).toBe('');
  });

  it('repositions and clamps the popup on map updates without moving camera or selection', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    const canvasRect = { left: 10, top: 20, width: 420, height: 360 };
    const updateMap = () =>
      mapUpdateHandlers[0]?.({
        type: 'update',
        location: { center: [37.8, 55.1], zoom: 16, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const canvas = mapElements[0]!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(
      () => ({ ...canvasRect }) as DOMRect
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    const popup = (
      await screen.findByRole('button', { name: 'Закрыть сведения об участке' })
    ).closest<HTMLDivElement>('.parcel-map-popup');
    const anchor = anchorElements[0];
    if (!popup || !anchor) throw new Error('Popup anchor missing');
    Object.defineProperty(popup, 'offsetHeight', { configurable: true, value: 80 });
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 390, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 168px'));
    expect(popup.getAttribute('style')).toContain('top: 210.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow--down')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(window.location.search).toBe('?p=SHR-L43');
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 210, top: 100, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.querySelector('.parcel-map-popup__arrow--up')).toBeTruthy());
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 10, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 12px'));
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    canvasRect.height = 180;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 110, top: 110, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 140.5px'));
    expect(popup.getAttribute('style')).toContain('top: 50.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 330, top: 110, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 40.5px'));
    expect(popup.getAttribute('style')).toContain('top: 50.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    canvasRect.width = 220;
    canvasRect.height = 130;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 120, top: 90, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('top: 32.5px'));
    expect(popup.getAttribute('style')).toContain('left: 12px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    expect(window.location.search).toBe('?p=SHR-L43');
    canvasRect.width = 300;
    canvasRect.height = 180;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: -50, top: -50, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('top: 45px'));
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();

    canvasRect.width = 420;
    canvasRect.height = 360;
    Object.defineProperty(popup, 'offsetWidth', { configurable: true, value: 360 });
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 418, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.style.left).toBe('48px'));
    expect(Number.parseFloat(popup.style.left) + popup.offsetWidth).toBeLessThanOrEqual(
      canvasRect.width - 12
    );
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
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
          [37.75609, 55.060756]
        ],
        duration: 220,
        easing: 'ease-in-out'
      },
      margin: [112, 80, 32, 80]
    });

    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    await fireEvent.click(cluster, { detail: 1 });

    expect(map.update.mock.lastCall?.[0].location.duration).toBe(0);

    cluster.focus();
    await fireEvent.click(cluster, { detail: 0 });
    cluster.replaceWith(marker);
    props.onRender?.([
      {
        clusterId: String(props.features[0]!.id),
        world: { x: 0, y: 0 },
        lnglat: props.features[0]!.geometry.coordinates,
        features: [props.features[0]!]
      }
    ]);
    update({
      type: 'update',
      location: {
        center: [37.74, 55.06],
        zoom: 16,
        bounds: [
          [37.7, 55.04],
          [37.77, 55.08]
        ]
      },
      camera: {},
      mapInAction: false
    });

    await waitFor(() => expect(document.activeElement).toBe(marker));
  });

  it('shows the fallback when the loaded API global is missing', async () => {
    const api = window.ymaps3;
    let reads = 0;

    Object.defineProperty(window, 'ymaps3', {
      configurable: true,
      get: () => (++reads === 1 ? api : undefined)
    });

    render(PlaceMap, { props: { places: [place] } });

    const status = await screen.findByRole('status');

    expect(status.textContent).toContain('Карта сейчас недоступна');
    expect(screen.queryByText('Загружаем карту…')).toBeNull();
  });
});
