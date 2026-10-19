import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { MapSelectionSetPublicDto } from '@/lib/map-selection-sets/public-types';

import PlaceMap from '../PlaceMap.svelte';
import {
  areaFeatures,
  clustererUpdates,
  map,
  mapClickHandlers,
  mapElements,
  markerElements,
  parcel,
  parcelContours,
  place,
  pondsPlace,
  registerPlaceMapSetup
} from './support';

vi.mock(import('@/lib/yandex-maps/runtime'), async (importOriginal) => ({
  ...(await importOriginal()),
  waitForStableLayout: async () => {},
  loadYandexMaps: async () => {
    await window.ymaps3?.ready;
  }
}));

const definition: MapSelectionSetPublicDto = {
  id: 'test-set',
  parcels: ['SHR-L43'],
  places: [],
  outline: false
};
const setUrl = '/map/data/selection-sets/test-set.json';
const fitCalls = () => map.update.mock.calls.filter(([update]) => update.location?.bounds);
const requestSet = (set = definition) =>
  vi.fn(async (url: string) => Response.json(url === setUrl ? set : [parcel]));

describe('PlaceMap selection sets', () => {
  registerPlaceMapSetup();

  it('frames all compound contours once, keeps selection and clears only set with original URL bytes', async () => {
    const compound = { ...parcel, geometry: { type: 'MultiPolygon', coordinates: parcelContours } };
    const fetch = vi.fn(async (url: string) =>
      Response.json(url === setUrl ? definition : [compound])
    );
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') }));
    const state = { navigation: 'set' };
    window.history.replaceState(state, '', '/map/?q=a%20b&flag&set=test-set#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fitCalls()).toHaveLength(1));
    expect(fitCalls()[0]?.[0].location).toMatchObject({
      bounds: [
        [37.701, 55.057],
        [37.749, 55.073]
      ],
      duration: 0
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([setUrl, '/map/data/parcels/shr.json']);
    const member = areaFeatures[0]!;
    expect(member.props.geometry).toEqual(compound.geometry);
    expect(member.props.style).toMatchObject({ stroke: [{ width: 2 }] });
    member.props.onClick?.({} as never, {} as never);
    expect(member.update.mock.lastCall?.[0].style).toMatchObject({ stroke: [{ width: 3 }] });
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(member.update.mock.lastCall?.[0].style).toEqual(member.props.style);
    member.props.onClick?.({} as never, {} as never);
    const calls = map.update.mock.calls.length;
    document.dispatchEvent(new Event('astro:page-load'));
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }), { detail: 0 });
    expect(window.location.search).toBe('?q=a%20b&flag&p=SHR-L43');
    expect(window.location.hash).toBe('#map');
    expect(window.history.state).toEqual(state);
    expect(map.update).toHaveBeenCalledTimes(calls);
    expect(member.update.mock.lastCall?.[0].style).toMatchObject({ stroke: [{ width: 3 }] });
    expect(document.activeElement).toBe(mapElements[0]);
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(member.update.mock.lastCall?.[0].style).toMatchObject({ stroke: [{ width: 1 }] });
    expect(map.removeChild).not.toHaveBeenCalledWith(member);
  });

  it.each(['p=SHR-L43', 'p=SHR-L99', 'p=unknown', 'h=burzhuyka', 'h=unknown'])(
    'never fits the set after a direct target %s',
    async (target) => {
      vi.stubGlobal('fetch', requestSet());
      window.history.replaceState({}, '', `/map/?set=test-set&${target}`);
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(areaFeatures).toHaveLength(1));
      expect(fitCalls()).toHaveLength(0);
      await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      document.dispatchEvent(new Event('astro:page-load'));
      expect(fitCalls()).toHaveLength(0);
    }
  );

  it.each(['pointer', 'wheel', 'key', 'blank-click', 'disable', 'clear', 'unmount'])(
    'cancels pending fit on %s and ignores late data',
    async (action) => {
      const pending = Promise.withResolvers<Response>();
      const fetch = vi.fn((url: string) =>
        url === setUrl ? Promise.resolve(Response.json(definition)) : pending.promise
      );
      vi.stubGlobal('fetch', fetch);
      window.history.replaceState({}, '', '/map/?set=test-set');
      const view = render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(fetch).toHaveBeenCalledWith('/map/data/parcels/shr.json'));
      const canvas = mapElements[0]!;
      if (action === 'pointer') await fireEvent.pointerDown(canvas);
      if (action === 'wheel') await fireEvent.wheel(canvas);
      if (action === 'key') await fireEvent.keyDown(canvas, { key: 'ArrowUp' });
      if (action === 'blank-click') mapClickHandlers[0]?.();
      if (action === 'disable') {
        await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
        await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
      }
      if (action === 'clear')
        await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      if (action === 'unmount') view.unmount();
      pending.resolve(Response.json([parcel]));
      if (action === 'disable' || action === 'unmount') {
        await pending.promise;
        await Promise.resolve();
      } else await waitFor(() => expect(areaFeatures).toHaveLength(1));
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fitCalls()).toHaveLength(0);
      if (action === 'disable' || action === 'unmount') expect(areaFeatures).toHaveLength(0);
    }
  );

  it('can remove a requested set before its definition arrives without enabling parts', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?set=test-set&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(setUrl));
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    pending.resolve(Response.json(definition));
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
    expect(window.location.search).toBe('?flag');
    expect(areaFeatures).toHaveLength(0);
    expect(fitCalls()).toHaveLength(0);
  });

  it.each(['bad-name!', 'test-set'])(
    'keeps an unavailable %s removable and ordinary map working',
    async (id) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(undefined, { status: 404 }))
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
      window.history.replaceState({}, '', `/map/?set=${id}`);
      render(PlaceMap, { props: { places: [place] } });
      await screen.findByRole('alert');
      expect(markerElements[0]?.getAttribute('href')).toBe(place.url);
      await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(window.location.search).toBe('');
    }
  );

  it('does not fit partial data, retries one failed part and preserves cancellation across quick toggles', async () => {
    const park = { ...parcel, code: 'SHP-A1', aliases: [], part: 'shp' };
    const fetch = vi.fn(async (url: string) => {
      if (url === setUrl) return Response.json({ ...definition, parcels: ['SHR-L43', 'SHP-A1'] });
      if (url.endsWith('shp.json')) return new Response(undefined, { status: 503 });
      return Response.json([parcel]);
    });
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?set=test-set');
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('alert');
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fitCalls()).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await fireEvent.click(river);
    fetch.mockImplementation(async (url) =>
      Response.json(url.endsWith('shp.json') ? [park] : [parcel])
    );
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Парк' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHP-A1')).toBe(true)
    );
    expect(fitCalls()).toHaveLength(0);
    expect(areaFeatures.at(-1)?.props.style).toMatchObject({ stroke: [{ width: 2 }] });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('shr.json'))).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps an incomplete-set error after a successful outline calculation', async () => {
    vi.stubGlobal(
      'fetch',
      requestSet({ ...definition, parcels: ['SHR-L43', 'SHR-L99'], outline: true })
    );
    window.history.replaceState({}, '', '/map/?set=test-set');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-selection-set-outline')).toBe(
        true
      )
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(fitCalls()).toHaveLength(0);
  });

  it('reports an outline failure without breaking individual membership or removal', async () => {
    vi.stubGlobal('fetch', requestSet({ ...definition, outline: true }));
    const add = map.addChild.mockImplementation((object) => {
      if (object.props?.id === 'parcel-selection-set-outline') throw new Error('outline rejected');
    });
    window.history.replaceState({}, '', '/map/?set=test-set');
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('alert');
    expect(areaFeatures[0]?.props.style).toMatchObject({ stroke: [{ width: 2 }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(window.location.search).toBe('');
    add.mockReset();
  });

  it('keeps membership and mixed geometry when the h timer ends', async () => {
    vi.stubGlobal('fetch', requestSet({ ...definition, parcels: [], places: [pondsPlace.slug] }));
    const timeout = vi.spyOn(window, 'setTimeout');
    window.history.replaceState({}, '', `/map/?set=test-set&h=${pondsPlace.slug}`);
    render(PlaceMap, { props: { places: [place, pondsPlace] } });
    await waitFor(() =>
      expect(markerElements.some((element) => element.dataset.selectionSet)).toBe(true)
    );
    const marker = markerElements.find((element) => element.dataset.selectionSet)!;
    const endHighlight = timeout.mock.calls.find(([, delay]) => delay === 5_000)?.[0];
    if (typeof endHighlight !== 'function') throw new Error('Highlight timer missing');
    endHighlight();
    expect(marker.dataset.highlighted).toBeUndefined();
    expect(marker.dataset.selectionSet).toBe('true');
    expect(window.location.search).toBe('?set=test-set');
    expect(
      areaFeatures
        .slice(-2)
        .every((feature) => !map.removeChild.mock.calls.some(([child]) => child === feature))
    ).toBe(true);
  });

  it('keeps a member place and all its mixed geometry out of clusters until removed', async () => {
    const set = { ...definition, parcels: [], places: [pondsPlace.slug] };
    vi.stubGlobal('fetch', requestSet(set));
    window.history.replaceState({}, '', '/map/?set=test-set');
    render(PlaceMap, { props: { places: [place, pondsPlace] } });
    await waitFor(() => expect(fitCalls()).toHaveLength(1));
    expect(
      clustererUpdates.mock.lastCall?.[0].features.map(({ id }: { id: string }) => id)
    ).toEqual([place.slug]);
    const marker = markerElements.find((element) => element.dataset.selectionSet === 'true')!;
    expect(marker.getAttribute('href')).toBe(pondsPlace.url);
    const features = areaFeatures.slice(-2);
    expect(
      features.every((feature) => map.addChild.mock.calls.some(([child]) => child === feature))
    ).toBe(true);
    await fireEvent.focus(marker);
    await fireEvent.blur(marker);
    expect(
      features.every((feature) => !map.removeChild.mock.calls.some(([child]) => child === feature))
    ).toBe(true);
    const cameraCalls = map.update.mock.calls.length;
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    expect(marker.dataset.selectionSet).toBeUndefined();
    expect(
      clustererUpdates.mock.lastCall?.[0].features.map(({ id }: { id: string }) => id)
    ).toEqual([place.slug, pondsPlace.slug]);
    expect(
      features.every((feature) => map.removeChild.mock.calls.some(([child]) => child === feature))
    ).toBe(true);
    expect(map.update).toHaveBeenCalledTimes(cameraCalls);
  });
});
