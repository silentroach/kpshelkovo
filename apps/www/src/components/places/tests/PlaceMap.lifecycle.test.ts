import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { getPlaceBounds } from '../place-map-geometry';
import PlaceMap from '../PlaceMap.svelte';
import {
  clustererProps,
  clustererImport,
  map,
  nativeControl,
  createControl,
  extras,
  importModule,
  markerElements,
  mapElements,
  areaFeatures,
  mapProps,
  place,
  publicPlace,
  pondsPlace,
  parcelFetch,
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
    await tick();
    await vi.dynamicImportSettled();
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
      await tick();
      await vi.dynamicImportSettled();
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
