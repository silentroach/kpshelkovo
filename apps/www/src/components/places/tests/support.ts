import { cleanup } from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import type {
  MapEventUpdateHandler,
  YMapControlsProps,
  YMapFeatureProps
} from '@yandex/ymaps3-types';
import { afterEach, beforeEach, vi } from 'vitest';

import type { ParcelDetailsPublicDto } from '@/lib/parcels/details-public-schema';
import type { PlaceMapPublicItemDto } from '@/lib/places/map-public-dto';
import type { PlaceMapItem } from '@/lib/places/map-types';

export const clustererProps: YMapClustererProps[] = [];
export const clustererImport = vi.fn<() => Promise<void>>();

export const map = {
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
export const nativeControl = {};
export const createControl = vi.fn(function (
  _props: YMapControlsProps,
  _children: readonly unknown[]
) {
  return nativeControl;
});
export const extras = { YMapOpenMapsButton: vi.fn(function () {}) };
export const importModule = vi.fn(async (_module: string) => extras);
export const markerElements: HTMLElement[] = [];
export const markerLocations: Array<{ readonly coordinates: readonly [number, number] }> = [];
export const mapElements: HTMLElement[] = [];
export const mapUpdateHandlers: MapEventUpdateHandler[] = [];
export const mapClickHandlers: Array<(object?: unknown) => void> = [];
export const anchorElements: HTMLElement[] = [];
export const areaFeatures: Array<{
  readonly props: YMapFeatureProps;
  readonly update: ReturnType<typeof vi.fn>;
}> = [];
export const schemeLayerProps: unknown[] = [];
export const mapProps: {
  readonly behaviors?: readonly string[];
  readonly margin?: readonly number[];
  readonly location: {
    readonly bounds?: readonly (readonly [number, number])[];
  };
}[] = [];

export const place: PlaceMapItem = {
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
export const publicPlace: PlaceMapPublicItemDto = {
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
export const titanicPlace: PlaceMapItem = {
  ...place,
  slug: 'titanic',
  name: 'Детская площадка «Титаник»',
  marker: 'titanic',
  coordinates: { lat: 55.060703, lng: 37.746894 },
  url: '/map/titanic/'
};
export const pondsPlace: PlaceMapItem = {
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
export const publicPondsPlace: PlaceMapPublicItemDto = {
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
export const parcel = {
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
export const parcelContours = [
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
export const parcelFetch = vi.fn(async (url: string) => {
  if (url === '/map/data/parcels/shr.json') return Response.json([parcel]);
  throw new Error(`Unexpected request: ${url}`);
});
export const details: ParcelDetailsPublicDto = {
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
export const parcelWithDetails = vi.fn(async (url: string) =>
  url.endsWith('/details/SHR-L43.json')
    ? Response.json(details)
    : Response.json([{ ...parcel, status: 'available' }])
);
export const parcelSelectionColor = '#365f7d';

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

export const registerPlaceMapSetup = (): void => {
  beforeEach(() => {
    vi.clearAllMocks();
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
};
