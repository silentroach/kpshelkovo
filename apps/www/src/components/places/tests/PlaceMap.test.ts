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
const parcelFetch = vi.fn(async (url: string) => {
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

  it('renders the full public collection as one hidden group, revealed by hover or focus', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('(hover: hover)') }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ places: [publicPondsPlace] }))
    );
    render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
    await waitFor(() => expect(markerElements).toHaveLength(2));

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

  it('does not let a late disabled response replace the active parcel cache', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('button', { name: 'Участки' });
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    pending.resolve(Response.json({ parcels: [] }));
    await Promise.resolve();
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
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

  it('selects both contours without extra text for a compound position', async () => {
    const group = {
      ...parcel,
      code: 'SHR-E35',
      aliases: [],
      multipleCadastralParcels: true,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [parcel.geometry.coordinates, parcel.geometry.coordinates]
      }
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([group, parcel]))
    );
    const timeout = vi.spyOn(window, 'setTimeout');
    window.history.replaceState({}, '', '/map/?p=SHR-E35');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-E35');
    expect(feature?.props.geometry).toMatchObject({
      type: 'MultiPolygon',
      coordinates: [parcel.geometry.coordinates, parcel.geometry.coordinates]
    });
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });
    const markersBeforeSelection = markerElements.length;
    feature?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(markerElements).toHaveLength(markersBeforeSelection);
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });

    const expire = timeout.mock.calls.findLast(([, delay]) => delay === 5_000)?.[0];
    if (typeof expire !== 'function') throw new Error('missing selection timeout');
    expire();
    expect(feature?.update.mock.lastCall?.[0].style).toEqual(feature?.props.style);
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
    await fireEvent.click(label);
    expect(markerElements.every((element) => !element.classList.contains('parcel-map-hint'))).toBe(
      true
    );
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });
    const single = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    single?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(single?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });
    expect(feature?.update.mock.lastCall?.[0].style).toEqual(feature?.props.style);
  });

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
    const timeout = vi.spyOn(window, 'setTimeout');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
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
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toMatchObject({ fillOpacity: 0.3 });
    await fireEvent.click(available);
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toEqual(areaFeatures[2]?.props.style);
    const timerIndex = timeout.mock.calls.findLastIndex(([, delay]) => delay === 5_000);
    const expire = timeout.mock.calls[timerIndex]?.[0];
    const timer = timeout.mock.results[timerIndex]?.value;
    if (typeof expire !== 'function') throw new Error('Parcel selection timer missing');
    window.clearTimeout(timer);
    expire();
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toEqual(areaFeatures[0]?.props.style);
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

  it('focuses alias links from the geometry feed, survives resize, and preserves URL state', async () => {
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
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels.json']);
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
    const timeout = vi.spyOn(window, 'setTimeout');
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

    const timerIndex = timeout.mock.calls.findLastIndex(([, delay]) => delay === 5_000);
    const expire = timeout.mock.calls[timerIndex]?.[0];
    const timer = timeout.mock.results[timerIndex]?.value;
    if (typeof expire !== 'function') throw new Error('Parcel selection timer missing');
    window.clearTimeout(timer);
    expire();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/map/?flag#map'
    );
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

  it('discards an unknown link after loading geometry without changing layer visibility', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels.json']);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect(screen.getByRole('button', { name: 'Участки' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
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
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels.json',
      '/map/data/parcels.json'
    ]);
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
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels.json',
      '/map/data/parcels.json'
    ]);
  });

  it('retries a failed JSON response without caching it', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{')).mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Участки' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch).toHaveBeenCalledTimes(2);
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
