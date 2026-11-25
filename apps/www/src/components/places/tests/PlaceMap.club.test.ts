import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParcelMapPublicSchema } from '@/lib/parcels/map-public-schema';
import type { PlaceMapItem } from '@/lib/places/map-types';

import { getPlaceBounds, getSelectionSetBounds } from '../place-map-geometry';
import PlaceMap from '../PlaceMap.svelte';
import {
  clustererProps,
  clustererUpdates,
  baseLayerUrl,
  clubLayerUrl,
  infrastructureLayerUrl,
  map,
  mapProps,
  mapElements,
  areaFeatures,
  markerElements,
  nativeControl,
  place,
  parcel,
  pondsPlace,
  publicPlace,
  registerPlaceMapSetup,
  roads
} from './support';

const layerOptions = vi.hoisted(() => ({ club: { fit: true as boolean | undefined } }));
vi.mock(import('@/lib/places/map-layers'), async (importOriginal) => ({
  ...(await importOriginal()),
  PLACE_MAP_LAYER_OPTIONS: layerOptions
}));

const club: PlaceMapItem = {
  ...pondsPlace,
  slug: 'greenforest-squash-time',
  mapLayer: 'club',
  marker: 'racket',
  coordinates: { lat: 55.029404, lng: 37.745748 },
  url: '/map/greenforest-squash-time/'
};
const infrastructure: PlaceMapItem = {
  ...place,
  slug: 'ktp',
  mapLayer: 'infra',
  url: '/map/ktp/'
};
const definition = {
  id: 'mixed',
  places: [club.slug, infrastructure.slug],
  parcels: [],
  outline: false
};
const clubDto = {
  ...publicPlace,
  slug: club.slug,
  mapLayer: 'club',
  coordinates: club.coordinates
};
const clubBase = () =>
  Response.json({
    places: [{ ...publicPlace, opening_hours: undefined }],
    placeLayers: { [club.slug]: 'club', [infrastructure.slug]: 'infra' }
  });
const clubResponse = () => Response.json({ places: [clubDto] });
const ready = async () => {
  await waitFor(() => expect(map.addChild).toHaveBeenCalledWith(nativeControl));
  await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
  return screen.getByRole<HTMLInputElement>('checkbox', { name: 'Клубные места' });
};
const clusterIds = () =>
  clustererUpdates.mock.lastCall?.[0].features.map(({ id }: { readonly id: string }) => id);

vi.mock(import('@/lib/yandex-maps/runtime'), async (importOriginal) => ({
  ...(await importOriginal()),
  waitForStableLayout: async () => {},
  loadYandexMaps: async () => {
    await window.ymaps3?.ready;
  }
}));

describe('club place layer', () => {
  registerPlaceMapSetup();
  beforeEach(() => {
    layerOptions.club.fit = true;
  });

  it('fits visible places on club enable and preserves the camera for other toggles', async () => {
    render(PlaceMap, { props: { places: [place, club, infrastructure] } });
    const checkbox = await ready();
    expect(checkbox.checked).toBe(false);
    expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([place.slug]);
    expect(mapProps[0]?.location.bounds).toEqual(getPlaceBounds([place]));
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, club.slug]);
    expect(map.update.mock.lastCall?.[0]).toEqual({
      location: { bounds: getPlaceBounds([place, club]), duration: 0 },
      margin: [112, 80, 32, 80]
    });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Инфраструктура' }));
    expect(clusterIds()).toEqual([place.slug, club.slug, infrastructure.slug]);
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, infrastructure.slug]);
    expect(map.update).toHaveBeenCalledTimes(calls + 1);
  });

  it.each([undefined, false])('does not fit when fit is %s', async (fit) => {
    layerOptions.club.fit = fit;
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, club.slug]);
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it('does not fit a layer without published places', async () => {
    render(PlaceMap, { props: { places: [place] } });
    const checkbox = await ready();
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it('includes already visible infrastructure and excludes geometry that is not displayed', async () => {
    render(PlaceMap, { props: { places: [place, club, infrastructure] } });
    const checkbox = await ready();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Инфраструктура' }));
    await fireEvent.click(checkbox);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(
      getPlaceBounds([place, club, infrastructure])
    );
  });

  it('keeps the fitted camera on layout refresh without repeated fitting', async () => {
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    await fireEvent.click(checkbox);
    const calls = map.update.mock.calls.length;
    await fireEvent.change(checkbox, { target: { checked: true } });
    document.dispatchEvent(new Event('astro:page-load'));
    await tick();
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it('fits already displayed parcel contours without revealing hidden geometry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([parcel]))
    );
    window.history.replaceState({}, '', '/map/?l=shr');
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === `parcel-${parcel.code}`)).toBe(true)
    );
    await fireEvent.click(checkbox);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(
      getSelectionSetBounds(ParcelMapPublicSchema.parse([parcel]), [
        { ...place, geometry: undefined },
        { ...club, geometry: undefined }
      ])
    );
  });

  it('includes currently revealed geometry of a visible place', async () => {
    const localPlace = { ...club, slug: 'local', mapLayer: undefined, url: '/map/local/' };
    render(PlaceMap, { props: { places: [place, localPlace, club] } });
    const checkbox = await ready();
    const marker = markerElements.find(
      (element) => element.getAttribute('href') === localPlace.url
    )!;
    mapElements[0]?.append(marker);
    marker.focus();
    await fireEvent.click(checkbox);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(
      getSelectionSetBounds(
        [],
        [{ ...place, geometry: undefined }, localPlace, { ...club, geometry: undefined }]
      )
    );
  });

  it('does not refit when a previously requested parcel part arrives later', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?l=shr');
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    await fireEvent.click(checkbox);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(getPlaceBounds([place, club]));
    const calls = map.update.mock.calls.length;
    pending.resolve(Response.json([parcel]));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === `parcel-${parcel.code}`)).toBe(true)
    );
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it('does not override a current direct place highlight', async () => {
    window.history.replaceState({}, '', `/map/?h=${place.slug}`);
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it('does not fit while a direct parcel is pending or selected', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', `/map/?p=${parcel.code}`);
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(map.update).toHaveBeenCalledTimes(calls);
    pending.resolve(Response.json([parcel]));
    await waitFor(() =>
      expect(areaFeatures.some(({ update }) => update.mock.calls.length)).toBe(true)
    );
    await fireEvent.click(checkbox);
    const selectedCalls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(map.update).toHaveBeenCalledTimes(selectedCalls);
  });

  it.each(['club', 'club,infra'])(
    'opens l=%s without fetching parcels or moving the initial camera',
    async (layers) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      window.history.replaceState({}, '', `/map/?l=${layers}`);
      render(PlaceMap, { props: { places: [place, club, infrastructure] } });
      expect((await ready()).checked).toBe(true);
      expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual(
        layers.includes('infra')
          ? [place.slug, club.slug, infrastructure.slug]
          : [place.slug, club.slug]
      );
      expect(fetch).not.toHaveBeenCalled();
      expect(mapProps[0]?.location.bounds).toEqual(getPlaceBounds([place]));
      expect(map.update.mock.calls.some(([update]) => update.location)).toBe(false);
    }
  );

  it.each(['manual', 'highlight'])(
    'keeps a late club layer hidden after disabling a %s request, then reuses it',
    async (cause) => {
      if (cause === 'highlight') window.history.replaceState({}, '', `/map/?h=${club.slug}`);
      const pending = Promise.withResolvers<Response>();
      const fetch = vi.fn((url: string) =>
        url === baseLayerUrl ? Promise.resolve(clubBase()) : pending.promise
      );
      vi.stubGlobal('fetch', fetch);
      const interval = vi.spyOn(window, 'setInterval');
      render(PlaceMap, { props: { dataUrl: baseLayerUrl } });
      const checkbox = await ready();
      if (cause === 'manual') {
        expect(fetch).toHaveBeenCalledExactlyOnceWith(baseLayerUrl);
        await fireEvent.click(checkbox);
      }
      expect(checkbox.checked).toBe(true);
      expect(fetch.mock.calls.map(([url]) => url)).toEqual([baseLayerUrl, clubLayerUrl]);
      await fireEvent.click(checkbox);
      const response = clubResponse();
      const json = vi.spyOn(response, 'json');
      pending.resolve(response);
      await waitFor(() => expect(json).toHaveBeenCalledOnce());
      expect(clusterIds()).toEqual([place.slug]);
      expect(map.update).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
      await fireEvent.click(checkbox);
      await waitFor(() => expect(clusterIds()).toEqual([place.slug, club.slug]));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(interval).toHaveBeenCalledWith(expect.any(Function), 60_000);
      expect(map.update.mock.calls.map(([update]) => update.location)).toEqual([
        { bounds: getPlaceBounds([place, club]), duration: 0 }
      ]);
    }
  );

  it.each(['h=unknown', `p=unknown&h=${club.slug}`])(
    'does not request a layer for %s',
    async (query) => {
      window.history.replaceState({}, '', `/map/?${query}`);
      const fetch = vi.fn(async () => clubBase());
      vi.stubGlobal('fetch', fetch);
      render(PlaceMap, { props: { dataUrl: baseLayerUrl } });
      expect((await ready()).checked).toBe(false);
      expect(fetch).toHaveBeenCalledExactlyOnceWith(baseLayerUrl);
      expect(map.update).not.toHaveBeenCalled();
    }
  );

  it('retries a failed l=club request without applying its initial camera fit', async () => {
    const fetch = vi.fn(async (url: string) =>
      url === baseLayerUrl ? clubBase() : new Response('', { status: 503 })
    );
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?l=club');
    render(PlaceMap, { props: { dataUrl: baseLayerUrl, initialBounds: getPlaceBounds([place]) } });
    const checkbox = await ready();
    await waitFor(() => expect(checkbox.checked).toBe(false));
    expect(map.update).not.toHaveBeenCalled();
    fetch.mockImplementationOnce(async () => clubResponse());
    await fireEvent.click(checkbox);
    await waitFor(() => expect(clusterIds()).toEqual([place.slug, club.slug]));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      baseLayerUrl,
      clubLayerUrl,
      clubLayerUrl
    ]);
    expect(map.update.mock.lastCall?.[0].location.bounds).toEqual(getPlaceBounds([place, club]));
  });

  it.each(['fit', 'highlight', 'disable'])(
    'deduplicates a layer shared by l and set and honors camera intent: %s',
    async (intent) => {
      const pending = Promise.withResolvers<Response>();
      const fetch = vi.fn(async (url: string) => {
        if (url === baseLayerUrl) return clubBase();
        if (url === clubLayerUrl) return pending.promise;
        if (url === infrastructureLayerUrl)
          return Response.json({
            places: [{ ...publicPlace, slug: infrastructure.slug, mapLayer: 'infra' }],
            roads
          });
        if (url === '/map/data/selection-sets/mixed.json') return Response.json(definition);
        throw new Error('Unexpected map request');
      });
      vi.stubGlobal('fetch', fetch);
      window.history.replaceState(
        {},
        '',
        `/map/?l=club&set=mixed${intent === 'highlight' ? `&h=${club.slug}` : ''}`
      );
      render(PlaceMap, {
        props: { dataUrl: baseLayerUrl, initialBounds: getPlaceBounds([place]) }
      });
      const checkbox = await ready();
      expect(checkbox.checked).toBe(true);
      await screen.findByRole('link', { name: 'OpenStreetMap' });
      expect(map.update).not.toHaveBeenCalled();
      const response = clubResponse();
      const json = vi.spyOn(response, 'json');
      if (intent === 'disable') await fireEvent.click(checkbox);
      pending.resolve(response);
      if (intent === 'disable') {
        await waitFor(() => expect(json).toHaveBeenCalledOnce());
        expect(checkbox.checked).toBe(false);
        expect(map.update).not.toHaveBeenCalled();
        expect(markerElements.some((marker) => marker.getAttribute('href') === club.url)).toBe(
          false
        );
        await fireEvent.click(checkbox);
      }
      await waitFor(() =>
        expect(
          markerElements.find((marker) => marker.getAttribute('href') === club.url)?.dataset
            .selectionSet
        ).toBe('true')
      );
      const cameraMoves = map.update.mock.calls.map(([update]) => update.location);
      if (intent === 'disable') expect(cameraMoves).toHaveLength(0);
      else if (intent === 'fit')
        expect(cameraMoves).toEqual([
          {
            bounds: getSelectionSetBounds([], [{ ...club, geometry: undefined }, infrastructure]),
            duration: 220,
            easing: 'ease-in-out'
          }
        ]);
      else
        expect(cameraMoves).toEqual([
          {
            center: [club.coordinates.lng, club.coordinates.lat],
            zoom: 16,
            duration: 220,
            easing: 'ease-in-out'
          }
        ]);
      expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        baseLayerUrl,
        clubLayerUrl,
        '/map/data/selection-sets/mixed.json',
        infrastructureLayerUrl
      ]);
    }
  );

  it.each([false, true])(
    'focuses a club place and keeps the layer on after highlight (reduced=%s)',
    async (reduced) => {
      vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
      const timeout = vi.spyOn(window, 'setTimeout');
      const state = { from: 'club' };
      window.history.replaceState(state, '', '/map/?flag&l=infra&h=greenforest-squash-time#map');
      render(PlaceMap, { props: { places: [place, club, infrastructure] } });
      const checkbox = await ready();
      expect(checkbox.checked).toBe(true);
      expect(map.update).toHaveBeenCalledWith({
        location: {
          center: [37.745748, 55.029404],
          zoom: 16,
          duration: reduced ? 0 : 220,
          easing: 'ease-in-out'
        }
      });
      const index = timeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
      const expire = timeout.mock.calls[index]?.[0];
      if (typeof expire !== 'function') throw new Error('Missing highlight timer');
      window.clearTimeout(timeout.mock.results[index]?.value);
      expire();
      expect(checkbox.checked).toBe(true);
      expect({
        search: window.location.search,
        hash: window.location.hash,
        state: window.history.state
      }).toMatchInlineSnapshot(`
      {
        "hash": "#map",
        "search": "?flag&l=infra",
        "state": {
          "from": "club",
        },
      }
    `);
    }
  );

  it.each(['h=unknown', 'p=unknown&h=greenforest-squash-time'])(
    'does not enable club for suppressed or invalid target %s',
    async (query) => {
      window.history.replaceState({}, '', `/map/?${query}`);
      render(PlaceMap, { props: { places: [place, club] } });
      expect((await ready()).checked).toBe(false);
      expect(map.update.mock.calls.some(([update]) => update.location?.center)).toBe(false);
    }
  );

  it('clears an active club highlight when hidden and does not restore it on re-enable', async () => {
    window.history.replaceState({}, '', '/map/?h=greenforest-squash-time');
    render(PlaceMap, { props: { places: [place, club] } });
    const checkbox = await ready();
    await fireEvent.click(checkbox);
    expect(window.location.search).toBe('');
    expect(
      markerElements
        .find((element) => element.getAttribute('href') === club.url)
        ?.hasAttribute('aria-current')
    ).toBe(false);
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(map.update).toHaveBeenCalledTimes(calls + 1);
  });

  it('enables both layers of a set, frames its members and preserves visibility after clearing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(definition))
    );
    window.history.replaceState({}, '', '/map/?set=mixed');
    render(PlaceMap, { props: { places: [place, club, infrastructure] } });
    const checkbox = await ready();
    await waitFor(() => expect(checkbox.checked).toBe(true));
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Инфраструктура' }).checked).toBe(
      true
    );
    expect(map.update).toHaveBeenCalledWith({
      location: {
        bounds: getSelectionSetBounds([], [club, infrastructure]),
        duration: 220,
        easing: 'ease-in-out'
      },
      margin: [112, 80, 32, 80]
    });
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug]);
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(
      markerElements.find((element) => element.getAttribute('href') === club.url)?.dataset
        .selectionSet
    ).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    expect(checkbox.checked).toBe(true);
    expect(clusterIds()).toEqual([place.slug, club.slug, infrastructure.slug]);
    expect(map.update).toHaveBeenCalledTimes(calls);
  });

  it.each(['disable', 'clear', 'unmount'])(
    'does not resurrect club from a late set response after %s',
    async (action) => {
      const pending = Promise.withResolvers<Response>();
      const parsed = Promise.withResolvers<typeof definition>();
      const response = Response.json(definition);
      const readJson = vi.spyOn(response, 'json').mockReturnValue(parsed.promise);
      vi.stubGlobal(
        'fetch',
        vi.fn(() => pending.promise)
      );
      window.history.replaceState({}, '', '/map/?set=mixed');
      const view = render(PlaceMap, { props: { places: [place, club, infrastructure] } });
      const checkbox = await ready();
      if (action === 'disable') {
        await fireEvent.click(checkbox);
        await fireEvent.click(checkbox);
      }
      if (action === 'clear')
        await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      if (action === 'unmount') view.unmount();
      const calls = map.update.mock.calls.length;
      const added = map.addChild.mock.calls.length;
      pending.resolve(response);
      await waitFor(() => expect(readJson).toHaveBeenCalledOnce());
      parsed.resolve(definition);
      await parsed.promise;
      await tick();
      if (action === 'disable') {
        await waitFor(() =>
          expect(
            screen.getByRole<HTMLInputElement>('checkbox', { name: 'Инфраструктура' }).checked
          ).toBe(true)
        );
        expect(checkbox.checked).toBe(false);
        expect(clusterIds()).not.toContain(club.slug);
        expect(map.addChild).toHaveBeenCalledTimes(added + 1);
      } else {
        expect(map.addChild).toHaveBeenCalledTimes(added);
        if (action === 'clear') expect(checkbox.checked).toBe(false);
      }
      expect(map.update).toHaveBeenCalledTimes(calls);
    }
  );
});
