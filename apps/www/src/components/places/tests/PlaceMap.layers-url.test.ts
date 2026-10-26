import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { MapSelectionSetPublicDto } from '@/lib/map-selection-sets/public-types';
import { ParcelMapPublicSchema } from '@/lib/parcels/map-public-schema';
import type { PlaceMapItem } from '@/lib/places/map-types';

import { getPlaceBounds, getSelectionSetBounds } from '../place-map-geometry';
import PlaceMap from '../PlaceMap.svelte';
import {
  areaFeatures,
  clustererProps,
  map,
  mapProps,
  markerElements,
  nativeControl,
  parcel,
  place,
  publicPlace,
  registerPlaceMapSetup
} from './support';

vi.mock(import('@/lib/yandex-maps/runtime'), async (importOriginal) => ({
  ...(await importOriginal()),
  waitForStableLayout: async () => {},
  loadYandexMaps: async () => {
    await window.ymaps3?.ready;
  }
}));

const infrastructure: PlaceMapItem = {
  ...place,
  slug: 'ktp-16',
  name: 'КТП №16',
  mapLayer: 'infra',
  coordinates: { lat: 55.067389, lng: 37.744332 },
  url: '/map/ktp-16/'
};
const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
const definition: MapSelectionSetPublicDto = {
  id: 'test-set',
  parcels: [parcel.code],
  places: [],
  outline: false
};
const setUrl = '/map/data/selection-sets/test-set.json';
const ready = async () => {
  await waitFor(() => expect(map.addChild).toHaveBeenCalledWith(nativeControl));
  await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
};
const checkbox = (name: string) => screen.getByRole<HTMLInputElement>('checkbox', { name });
const fetchParts = () =>
  vi.fn(async (url: string) => {
    const part = url.split('/').at(-1)?.replace('.json', '');
    return Response.json([{ ...parcel, code: `${part?.toUpperCase()}-M1`, aliases: [], part }]);
  });

describe('PlaceMap initial layers from URL', () => {
  registerPlaceMapSetup();

  it.each([false, true])(
    'opens all requested layers without moving the camera (mobile=%s)',
    async (mobile) => {
      const fetch = fetchParts();
      vi.stubGlobal('fetch', fetch);
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: mobile && query.includes('max-width')
      }));
      const query = '?flag&q=a%20b&l=parcels,infra,shf&l=unknown';
      window.history.replaceState({ source: 'layers' }, '', `/map/${query}#map`);
      render(PlaceMap, { props: { places: [place, infrastructure] } });
      await ready();
      await waitFor(() => expect(areaFeatures).toHaveLength(4));
      expect(
        ['Участки', 'Форест', 'Вилладж', 'Парк', 'Ривер', 'Инфраструктура'].every(
          (name) => checkbox(name).checked
        )
      ).toBe(true);
      expect(fetch.mock.calls.map(([url]) => url).sort()).toMatchInlineSnapshot(`
      [
        "/map/data/parcels/shf.json",
        "/map/data/parcels/shp.json",
        "/map/data/parcels/shr.json",
        "/map/data/parcels/shv.json",
      ]
    `);
      expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([
        place.slug,
        infrastructure.slug
      ]);
      expect(mapProps[0]?.location.bounds).toEqual(getPlaceBounds([place]));
      expect(map.update).not.toHaveBeenCalled();
      expect(window.location.search).toBe(query);
    }
  );

  it.each(['', '?l=', '?l=unknown,infrastructure', '?l=unknown,,&l='])(
    'ignores query %s without requests or errors',
    async (query) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      window.history.replaceState({}, '', `/map/${query}`);
      render(PlaceMap, { props: { places: [place, infrastructure] } });
      await ready();
      expect(fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeFalsy();
      expect(checkbox('Инфраструктура').checked || checkbox('Участки').checked).toBe(false);
      expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([place.slug]);
      expect(window.location.search).toBe(query);
    }
  );

  it('applies infrastructure after the public places arrive without a focus request', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?l=infra');
    render(PlaceMap, {
      props: { dataUrl: '/map/data/places.json', initialBounds: getPlaceBounds([place]) }
    });
    await waitFor(() => expect(mapProps).toHaveLength(1));
    pending.resolve(
      Response.json({
        places: [publicPlace, { ...publicPlace, slug: infrastructure.slug, mapLayer: 'infra' }]
      })
    );
    await ready();
    expect(checkbox('Инфраструктура').checked).toBe(true);
    expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([
      place.slug,
      infrastructure.slug
    ]);
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/map/data/places.json');
    expect(map.update).not.toHaveBeenCalled();
  });

  it('combines extra layers with an alias p, suppresses h and preserves URL bytes on selection changes', async () => {
    const fetch = vi.fn(async (url: string) =>
      Response.json(url.endsWith('shf.json') ? [forest] : [parcel])
    );
    vi.stubGlobal('fetch', fetch);
    const state = { source: 'parcel' };
    const query = '?l=infra,shf&q=a%20b&flag&h=ktp-16';
    window.history.replaceState(state, '', `/map/${query}&p=shr-l44#map`);
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    await ready();
    await waitFor(() => expect(window.location.search).toContain('p=SHR-L43'));
    expect(
      checkbox('Форест').checked && checkbox('Ривер').checked && checkbox('Инфраструктура').checked
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      map.update.mock.calls
        .filter(([update]) => update.location?.center)
        .map(([update]) => update.location.zoom)
    ).toEqual([17]);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect({
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state
    }).toEqual({ search: query, hash: '#map', state });
    const member = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    member?.props.onClick?.({} as never, {} as never);
    expect(window.location.search).toBe(`${query}&p=SHR-L43`);
  });

  it('keeps an explicitly requested part after an unknown p without duplicate requests', async () => {
    const fetch = vi.fn(async () => Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?l=shr&p=SHR-L99');
    render(PlaceMap, { props: { places: [place] } });
    await ready();
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(checkbox('Ривер').checked).toBe(true);
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/map/data/parcels/shr.json');
    expect(window.location.search).toBe('?l=shr');
    expect(map.update).not.toHaveBeenCalled();
  });

  it('adds the h target layer and leaves l unchanged when the highlight expires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([forest]))
    );
    const timeout = vi.spyOn(window, 'setTimeout');
    window.history.replaceState({}, '', '/map/?l=shf&h=ktp-16');
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    await ready();
    expect(checkbox('Форест').checked && checkbox('Инфраструктура').checked).toBe(true);
    expect(
      map.update.mock.calls.find(([update]) => update.location?.center)?.[0].location.center
    ).toEqual([infrastructure.coordinates.lng, infrastructure.coordinates.lat]);
    const index = timeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
    const expire = timeout.mock.calls[index]?.[0];
    if (typeof expire !== 'function') throw new Error('Highlight timer missing');
    window.clearTimeout(timeout.mock.results[index]?.value);
    expire();
    expect(window.location.search).toBe('?l=shf');
    expect(checkbox('Инфраструктура').checked).toBe(true);
  });

  it.each(['', '&p=SHR-L43', '&h=burzhuyka'])(
    'combines a set and extra layers without changing camera priority: %s',
    async (target) => {
      const fetch = vi.fn(async (url: string) =>
        Response.json(url === setUrl ? definition : url.endsWith('shf.json') ? [forest] : [parcel])
      );
      vi.stubGlobal('fetch', fetch);
      window.history.replaceState({}, '', `/map/?l=infra,shf&set=test-set${target}`);
      render(PlaceMap, { props: { places: [place, infrastructure] } });
      await ready();
      await waitFor(() => expect(areaFeatures).toHaveLength(2));
      const fitCalls = map.update.mock.calls.filter(([update]) => update.location?.bounds);
      if (target) expect(fitCalls).toHaveLength(0);
      else
        expect(fitCalls[0]?.[0].location.bounds).toEqual(
          getSelectionSetBounds(ParcelMapPublicSchema.parse([parcel]), [])
        );
      expect(
        checkbox('Форест').checked &&
          checkbox('Ривер').checked &&
          checkbox('Инфраструктура').checked
      ).toBe(true);
      await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      expect(window.location.search).toContain('l=infra,shf');
      expect(checkbox('Инфраструктура').checked).toBe(true);
    }
  );

  it.each(['Ривер', 'Участки'])(
    'does not restore manually hidden parts after late geometry: %s',
    async (toggle) => {
      const pending = Promise.withResolvers<Response>();
      const fetch = vi.fn(() => pending.promise);
      vi.stubGlobal('fetch', fetch);
      const query = toggle === 'Участки' ? '?l=parcels' : '?l=shr';
      window.history.replaceState({}, '', `/map/${query}`);
      render(PlaceMap, { props: { places: [place] } });
      await ready();
      await fireEvent.click(checkbox(toggle));
      pending.resolve(Response.json([parcel]));
      await pending.promise;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(checkbox(toggle).checked).toBe(false);
      expect(areaFeatures).toHaveLength(0);
      expect(window.location.search).toBe(query);
      expect(map.update).not.toHaveBeenCalled();
    }
  );

  it('does not let a late set restore URL layers disabled by hand', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url === setUrl ? pending.promise : Promise.resolve(Response.json([parcel]))
      )
    );
    window.history.replaceState({}, '', '/map/?l=shr,infra&set=test-set');
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    await ready();
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.click(checkbox('Ривер'));
    await fireEvent.click(checkbox('Инфраструктура'));
    pending.resolve(Response.json({ ...definition, places: [infrastructure.slug] }));
    await pending.promise;
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(checkbox('Ривер').checked || checkbox('Инфраструктура').checked).toBe(false);
    expect(markerElements.some((element) => element.dataset.selectionSet)).toBe(false);
    expect(map.update).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?l=shr,infra&set=test-set');
  });

  it('reapplies the original URL after remount instead of persisting manual state', async () => {
    window.history.replaceState({}, '', '/map/?l=infra');
    const first = render(PlaceMap, { props: { places: [place, infrastructure] } });
    await ready();
    await fireEvent.click(checkbox('Инфраструктура'));
    expect(checkbox('Инфраструктура').checked).toBe(false);
    first.unmount();
    map.addChild.mockClear();
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    await ready();
    expect(checkbox('Инфраструктура').checked).toBe(true);
    expect(window.location.search).toBe('?l=infra');
  });

  it('reports a requested part loading error and retries through its ordinary switch', async () => {
    const fetch = vi.fn(async () => new Response(undefined, { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?l=shr');
    render(PlaceMap, { props: { places: [place] } });
    await ready();
    await screen.findByRole('alert');
    expect(checkbox('Ривер').checked).toBe(false);
    fetch.mockResolvedValue(Response.json([parcel]));
    await fireEvent.click(checkbox('Ривер'));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeFalsy();
    expect(window.location.search).toBe('?l=shr');
    expect(map.update).not.toHaveBeenCalled();
  });
});
