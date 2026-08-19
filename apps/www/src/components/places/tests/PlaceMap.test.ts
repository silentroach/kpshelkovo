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
  summary: 'Фудтрак в Шелково Форест',
  address: 'Шелково Форест, Берёзовая улица, 21А',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  mapUrl: 'https://yandex.ru/navi/-/CTfgq-5r',
  contactUrl: '/sarafan/food/burzhuyka/',
  updatedIso: '2026-08-11',
  url: '/places/burzhuyka/',
  markdownUrl: '/places/burzhuyka/index.md',
  canonical: 'https://kpshelkovo.online/places/burzhuyka/',
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
    markerElements.length = 0;
    schemeLayerProps.length = 0;
    mapProps.length = 0;
    installYandexMaps();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the place as an accessible detail link and fits the settlement', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(markerElements).toHaveLength(1));

    expect(markerElements[0]).toMatchInlineSnapshot(`
      <a
        aria-label="Открыть место «Буржуйка»"
        class="place-map-marker"
        href="/places/burzhuyka/"
        title="Буржуйка"
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
});
