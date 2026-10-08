import { fireEvent, render, waitFor } from '@testing-library/svelte';
import type { YMapClustererProps } from '@yandex/ymaps3-clusterer';
import { describe, expect, it, vi } from 'vitest';

import { PLACE_MARKER_IMAGES } from '@/components/places/marker-images';

import { getPlaceBounds } from '../place-map-geometry';
import PlaceMap from '../PlaceMap.svelte';
import {
  clustererProps,
  map,
  nativeControl,
  markerElements,
  markerLocations,
  mapElements,
  mapUpdateHandlers,
  areaFeatures,
  schemeLayerProps,
  mapProps,
  place,
  publicPlace,
  titanicPlace,
  pondsPlace,
  publicPondsPlace,
  registerPlaceMapSetup
} from './support';

// Keep this mock in the test so it is hoisted before the component import.
vi.mock(import('@/lib/yandex-maps/runtime'), async (importOriginal) => {
  const runtime = await importOriginal();
  return {
    ...runtime,
    waitForStableLayout: async () => {},
    loadYandexMaps: async () => {
      const maps = window.ymaps3;
      if (!maps) return runtime.loadYandexMaps();
      await maps.ready;
    }
  };
});

describe('PlaceMap', () => {
  registerPlaceMapSetup();

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
});
