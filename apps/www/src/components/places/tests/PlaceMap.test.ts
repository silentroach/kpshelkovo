import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Place } from '@/lib/places/types';

import PlaceMap from '../PlaceMap.svelte';

const map = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
};
const markerElements: HTMLElement[] = [];
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
  updatedAt: new Date('2026-08-11T00:00:00.000Z'),
  updatedIso: '2026-08-11',
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
        _: HTMLElement,
        props: (typeof mapProps)[number],
      ) {
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
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    installYandexMaps();
  });

  afterEach(() => {
    cleanup();
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

  it('leaves one-finger scrolling to the page on coarse pointers', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(mapProps).toHaveLength(1));

    expect(mapProps[0]?.behaviors).toEqual(['pinchZoom', 'dblClick']);
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
            128,
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
});
