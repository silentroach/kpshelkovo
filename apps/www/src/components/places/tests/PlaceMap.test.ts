import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import type {
  MapEventUpdateHandler,
  YMapControlsProps,
  YMapFeatureProps
} from '@yandex/ymaps3-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaceMapPublicItemDto } from '@/lib/places/map-public-dto';
import type { PlaceMapItem } from '@/lib/places/map-types';

import PlaceMap from '../PlaceMap.svelte';

const clustererProps = vi.hoisted(() => [] as YMapClustererProps[]);

vi.mock('@yandex/ymaps3-clusterer', () => ({
  YMapClusterer: vi.fn(function YMapClusterer(props: YMapClustererProps) {
    clustererProps.push(props);
    for (const feature of props.features) props.marker(feature);
    return {};
  }),
  clusterByGrid: vi.fn(() => ({ render: vi.fn() }))
}));

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
              [37.74, 55.05]
            ]
          ]
        ]
      }
    }
  },
  url: '/map/hunting-ponds/'
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
const parcelFetch = vi.fn(async (url: string) => {
  if (url === '/map/data/parcel-search.json') {
    return Response.json({
      parcels: [{ code: parcel.code, aliases: parcel.aliases, part: parcel.part }]
    });
  }
  if (url === '/map/data/parcels.json') return Response.json([parcel]);
  throw new Error(`Unexpected request: ${url}`);
});

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
      }) {
        if (props.onUpdate) mapUpdateHandlers.push(props.onUpdate);
        return {};
      }),
      YMapMarker: vi.fn(function YMapMarker(
        props: { readonly coordinates: readonly [number, number] },
        element: HTMLElement
      ) {
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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    markerElements.length = 0;
    markerLocations.length = 0;
    mapElements.length = 0;
    mapUpdateHandlers.length = 0;
    areaFeatures.length = 0;
    clustererProps.length = 0;
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    document.documentElement.style.setProperty('--color-water', '#1c668c');
    document.documentElement.style.setProperty('--color-neutral-soft', '#eef0ec');
    document.documentElement.style.setProperty('--color-text-muted', '#45564b');
    document.documentElement.style.setProperty('--color-accent', '#d6a22a');
    document.documentElement.style.setProperty('--color-accent-text', '#805019');
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
      '--color-accent-text'
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
    await waitFor(() => expect(map.addChild).toHaveBeenCalledWith(nativeControl));
    expect(createControl.mock.calls[0]?.[0]).toEqual({ position: 'bottom right' });
    first.unmount();
    expect(map.destroy).toHaveBeenCalledOnce();

    const second = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(createControl).toHaveBeenCalledTimes(2));
    second.unmount();
    expect(map.destroy).toHaveBeenCalledTimes(2);
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
      expect(map.addChild).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    }
  );

  it('uses the existing place fallback when the control module fails', async () => {
    importModule.mockRejectedValueOnce(new Error('Control unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('status');
    expect(screen.getByRole('link').getAttribute('href')).toBe(place.url);
    expect(map.destroy).toHaveBeenCalledOnce();
    expect(map.addChild).not.toHaveBeenCalled();
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
    expect(map.update.mock.lastCall?.[0].margin).toEqual([112, 32, 32, 32]);
    expect(mapProps[0]).toMatchObject({
      copyrightsPosition: 'bottom left',
      distributionPosition: 'bottom right'
    });
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
            marker: 'apple'
          },
          { ...place, marker: 'foodtruck' },
          titanicPlace,
          {
            ...titanicPlace,
            slug: 'construction',
            name: 'Строительство',
            marker: 'construction',
            status: 'underConstruction'
          },
          {
            ...titanicPlace,
            slug: 'hunting-ponds',
            name: 'Охотничьи пруды',
            marker: 'fish'
          },
          {
            ...titanicPlace,
            slug: 'forest-checkpoint',
            name: 'КПП Фореста',
            marker: 'kpp'
          },
          {
            ...titanicPlace,
            slug: 'animals-wehome',
            name: 'Животные в Зеркальных домах',
            marker: 'animals'
          }
        ]
      }
    });

    await waitFor(() => expect(markerElements).toHaveLength(7));

    const markerDetails = markerElements.map((marker) => {
      const image = marker.querySelector('img');

      return {
        marker: marker.dataset.marker,
        graphicClass: marker.querySelector('[aria-hidden="true"]')?.className,
        hasClosedIndicator: Boolean(marker.querySelector('.place-map-marker-closed-indicator')),
        imageClass: image?.className,
        imageDimensions: [image?.width, image?.height],
        imageFile: image?.src.split('/').at(-1),
        usesDefaultPoint: Boolean(marker.querySelector('.ui-map-marker'))
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
      title: markerElements[3]?.title
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": "Открыть место «Строительство», Строится, сейчас закрыто",
        "title": "Строительство",
      }
    `);
  });

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

  it('previews an area on fine-pointer hover and keyboard focus', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('(hover: hover)')
    }));

    render(PlaceMap, { props: { places: [pondsPlace] } });

    await waitFor(() => expect(areaFeatures).toHaveLength(1));

    const feature = areaFeatures[0];
    const marker = markerElements[0];

    if (!feature || !marker) throw new Error('area preview fixtures are missing');

    expect({
      id: feature.props.id,
      geometryType: feature.props.geometry.type,
      initialStyle: feature.props.style
    }).toMatchInlineSnapshot(`
      {
        "geometryType": "MultiPolygon",
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
        metaKey: false
      },
      stopPropagation: vi.fn()
    });
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
      fillOpacity: 0,
      interactive: true
    });

    featureMouseLeave(new MouseEvent('mouseleave'), {
      screenCoordinates: [0, 0],
      coordinates: [37.74, 55.05],
      details: {
        type: 'mouseleave',
        shiftKey: false,
        altKey: false,
        metaKey: false
      },
      stopPropagation: vi.fn()
    });
    expect(feature.update.mock.lastCall?.[0].style).toEqual({
      zIndex: 0,
      fillOpacity: 0,
      interactive: false,
      stroke: []
    });

    await fireEvent.focus(marker);
    expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
      fillOpacity: 0,
      interactive: true
    });

    await fireEvent.keyDown(marker, { key: 'Escape' });
    expect(feature.update.mock.lastCall?.[0].style).toEqual({
      zIndex: 0,
      fillOpacity: 0,
      interactive: false,
      stroke: []
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
          stroke: expect.arrayContaining([expect.objectContaining({ dash: [6, 3], width: 2.5 })])
        })
      })
    );
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
    expect(layers.textContent).toBe('');
    expect(layers.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    await fireEvent.click(layers);
    expect(parcelFetch).not.toHaveBeenCalled();
    const toggle = screen.getByRole('button', { name: 'Участки' });
    expect(toggle.textContent?.trim()).toBe('Участки');
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(toggle);
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels.json']);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual([
      [37.715242, 55.059526],
      [37.717242, 55.061526]
    ]);

    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(toggle);
    expect(map.removeChild).toHaveBeenCalledWith(feature);
    await fireEvent.click(toggle);
    expect(parcelFetch).toHaveBeenCalledTimes(1);
    expect(markerElements[0]?.getAttribute('href')).toBe(place.url);
    expect(map.addChild).toHaveBeenCalledWith(nativeControl);
  });

  it('closes the layer list outside and on Escape, returning keyboard focus', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));

    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const toggle = screen.getByRole('button', { name: 'Участки' });
    toggle.focus();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(layers);

    await fireEvent.click(layers);
    await fireEvent.pointerDown(document.body);
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(parcelFetch).not.toHaveBeenCalled();
  });

  it('ignores a parcel response after the layer is disabled or the component unmounts', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('button', { name: 'Участки' });
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(toggle.getAttribute('aria-pressed')).toBe('false'));
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();

    const later = Promise.withResolvers<Response>();
    fetch.mockReturnValue(later.promise);
    await fireEvent.click(toggle);
    view.unmount();
    later.resolve(Response.json([parcel]));
    await Promise.resolve();
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();
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
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows one short label from zoom 17 and no extra text for a merged parcel', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
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
    const label = markerElements.find((element) => element.classList.contains('parcel-map-label'));
    expect(label?.textContent).toBe('L43');
    expect(label?.querySelector('span')?.textContent).toBe('L43');
    expect(label?.getAttribute('aria-label')).toBe('Выбрать участок SHR-L43');
    if (!label) throw new Error('Parcel label missing');
    const geometry = areaFeatures[0]?.props.geometry;
    const labelIndex = markerElements.indexOf(label);
    const labelCoordinates = markerLocations[labelIndex]?.coordinates;
    if (geometry?.type !== 'Polygon' || !labelCoordinates)
      throw new Error('Parcel display geometry missing');
    const vertex = geometry.coordinates[0]?.[0];
    expect(vertex).toEqual([37.71, 55.06]);
    expect(labelCoordinates).toEqual([37.715, 55.065]);
    const labelMarker = map.addChild.mock.lastCall?.[0];
    await fireEvent.click(label);
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });
    expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();

    update({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 16, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    expect(map.removeChild).toHaveBeenCalledWith(labelMarker);
  });

  it('replaces parcel selection, restarts its timer, and cancels it on unmount', async () => {
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
    const setTimeout = vi.spyOn(window, 'setTimeout');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(areaFeatures.map(({ props }) => props.style?.stroke)).toMatchInlineSnapshot(`
      [
        [
          {
            "color": "#45564b",
            "opacity": 0.5,
            "width": 1,
          },
        ],
        [
          {
            "color": "#45564b",
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
    const firstTimerIndex = setTimeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
    const firstTimer = setTimeout.mock.results[firstTimerIndex]?.value;

    await fireEvent.click(secondLabel);
    expect(screen.queryByText('SHR-L46')).toBeNull();
    expect(clearTimeout).toHaveBeenCalledWith(firstTimer);
    expect(setTimeout.mock.calls.filter(([, delay]) => delay === 5_000)).toHaveLength(2);
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#45564b', width: 1, opacity: 0.5 }]
    });
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });

    const secondTimerIndex = setTimeout.mock.calls.findLastIndex(([, delay]) => delay === 5_000);
    const secondTimer = setTimeout.mock.results[secondTimerIndex]?.value;
    const expire = setTimeout.mock.calls[secondTimerIndex]?.[0];
    if (typeof expire !== 'function') throw new Error('Parcel selection timer missing');
    window.clearTimeout(secondTimer);
    expire();
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#45564b', width: 1, opacity: 0.5 }]
    });
    await fireEvent.click(secondLabel);
    const renewedTimerIndex = setTimeout.mock.calls.findLastIndex(([, delay]) => delay === 5_000);
    const renewedTimer = setTimeout.mock.results[renewedTimerIndex]?.value;
    view.unmount();
    expect(clearTimeout).toHaveBeenCalledWith(renewedTimer);
  });

  it('focuses alias links after resolving the dictionary, survives resize, and preserves URL state', async () => {
    const fetch = vi.fn((url: string) =>
      url === '/map/data/parcels.json'
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
    const timeout = vi.spyOn(window, 'setTimeout');
    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() =>
      expect(
        areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')?.update
      ).toHaveBeenCalled()
    );
    expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect(screen.getByRole('button', { name: 'Участки' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcel-search.json',
      '/map/data/parcels.json'
    ]);
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

    const timerIndex = timeout.mock.calls.findIndex(([, delay]) => delay === 5000);
    const expire = timeout.mock.calls[timerIndex]?.[0];
    const timer = timeout.mock.results[timerIndex]?.value;
    if (typeof expire !== 'function') throw new Error('Parcel timeout missing');
    window.clearTimeout(timer);
    expire();
    expect(replace.mock.lastCall).toEqual([historyState, '', '/map/?q=a%20b&flag&h=burzhuyka#map']);
    document.dispatchEvent(new Event('astro:page-load'));
    expect(map.update.mock.calls.length).toBe(count);
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

  it('discards an unknown link before loading geometry without changing layer visibility', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcel-search.json']);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect(screen.getByRole('button', { name: 'Участки' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(areaFeatures).toHaveLength(0);
  });

  it('keeps a direct-link intent after a failed dictionary request and retries it', async () => {
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
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcel-search.json',
      '/map/data/parcel-search.json',
      '/map/data/parcels.json'
    ]);
  });

  it('treats a dictionary/geometry mismatch as retryable data error', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(parcelFetch)
      .mockResolvedValueOnce(Response.json([]))
      .mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });

    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcel-search.json',
      '/map/data/parcels.json',
      '/map/data/parcels.json'
    ]);
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
