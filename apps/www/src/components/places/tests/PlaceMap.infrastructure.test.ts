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
  clustererUpdates,
  map,
  mapElements,
  mapProps,
  markerElements,
  nativeControl,
  parcel,
  place,
  pondsPlace,
  publicPlace,
  registerPlaceMapSetup
} from './support';

const infrastructure: PlaceMapItem = {
  ...pondsPlace,
  slug: 'ktp-16',
  name: 'КТП №16',
  marker: 'ktp',
  mapLayer: 'infra',
  coordinates: { lat: 55.067389, lng: 37.744332 },
  url: '/map/ktp-16/'
};
const otherInfrastructure: PlaceMapItem = {
  ...infrastructure,
  slug: 'ktp-15',
  geometry: undefined,
  coordinates: { lat: 55.065643, lng: 37.740351 },
  url: '/map/ktp-15/'
};
const definition: MapSelectionSetPublicDto = {
  id: 'infrastructure',
  places: [infrastructure.slug],
  parcels: [],
  outline: false
};
const setUrl = '/map/data/selection-sets/infrastructure.json';
const ready = async () => {
  await waitFor(() => expect(map.addChild).toHaveBeenCalledWith(nativeControl));
  await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
  return screen.getByRole('checkbox', { name: 'Инфраструктура' });
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

describe('PlaceMap infrastructure layer', () => {
  registerPlaceMapSetup();

  it('starts hidden and toggles the scene independently without moving the camera', async () => {
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    const checkbox = await ready();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([place.slug]);
    expect(mapProps[0]?.location.bounds).toEqual(getPlaceBounds([place]));
    const cameraCalls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, infrastructure.slug]);
    expect((screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement).checked).toBe(
      false
    );
    const features = clustererUpdates.mock.lastCall?.[0].features;
    clustererProps[0]?.marker(features[1]);
    const marker = markerElements.find((item) => item.getAttribute('href') === infrastructure.url)!;
    mapElements[0]?.append(marker);
    marker.focus();
    expect(
      areaFeatures.every((feature) => map.addChild.mock.calls.some(([child]) => child === feature))
    ).toBe(true);
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug]);
    expect(
      areaFeatures.every((feature) =>
        map.removeChild.mock.calls.some(([child]) => child === feature)
      )
    ).toBe(true);
    expect(document.activeElement).toBe(mapElements[0]);
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, infrastructure.slug]);
    expect(map.update).toHaveBeenCalledTimes(cameraCalls);
  });

  it.each([false, true])(
    'opens the layer for h and leaves it enabled after highlight (reduced=%s)',
    async (reduced) => {
      vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
      const timeout = vi.spyOn(window, 'setTimeout');
      const state = { navigation: 'ktp' };
      window.history.replaceState(state, '', '/map/?flag&q=a%20b&h=ktp-16#map');
      render(PlaceMap, { props: { places: [place, infrastructure, otherInfrastructure] } });
      const checkbox = await ready();
      expect((checkbox as HTMLInputElement).checked).toBe(true);
      expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([
        place.slug,
        infrastructure.slug,
        otherInfrastructure.slug
      ]);
      expect(map.update).toHaveBeenCalledWith({
        location: {
          center: [37.744332, 55.067389],
          zoom: 16,
          duration: reduced ? 0 : 220,
          easing: 'ease-in-out'
        }
      });
      const index = timeout.mock.calls.findIndex(([, delay]) => delay === 5_000);
      const expire = timeout.mock.calls[index]?.[0];
      if (typeof expire !== 'function') throw new Error('missing highlight timer');
      window.clearTimeout(timeout.mock.results[index]?.value);
      expire();
      expect((checkbox as HTMLInputElement).checked).toBe(true);
      expect({
        search: window.location.search,
        hash: window.location.hash,
        state: window.history.state
      }).toMatchInlineSnapshot(`
      {
        "hash": "#map",
        "search": "?flag&q=a%20b",
        "state": {
          "navigation": "ktp",
        },
      }
    `);
    }
  );

  it.each(['h=unknown', 'p=unknown&h=ktp-16'])(
    'does not enable infrastructure for an invalid or suppressed target %s',
    async (query) => {
      window.history.replaceState({}, '', `/map/?${query}`);
      render(PlaceMap, { props: { places: [place, infrastructure] } });
      const checkbox = await ready();
      expect((checkbox as HTMLInputElement).checked).toBe(false);
      expect(map.update.mock.calls.some(([update]) => update.location?.center)).toBe(false);
    }
  );

  it('cancels active highlight on manual hiding and does not restore it on re-enable', async () => {
    window.history.replaceState({}, '', '/map/?h=ktp-16');
    render(PlaceMap, { props: { places: [place, infrastructure] } });
    const checkbox = await ready();
    const marker = markerElements.find((item) => item.getAttribute('href') === infrastructure.url)!;
    await fireEvent.click(checkbox);
    expect(marker.hasAttribute('aria-current')).toBe(false);
    expect(window.location.search).toBe('');
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    document.dispatchEvent(new Event('astro:page-load'));
    await waitFor(() => expect(map.update.mock.lastCall?.[0].location?.center).toBeUndefined());
    expect(map.update.mock.calls.slice(calls).some(([update]) => update.location?.center)).toBe(
      false
    );
  });

  it('maps the layer from the public payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          places: [publicPlace, { ...publicPlace, slug: 'ktp-16', mapLayer: 'infra' }]
        })
      )
    );
    render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
    const checkbox = await ready();
    expect(clustererProps[0]?.features.map(({ id }) => id)).toEqual([place.slug]);
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug, 'ktp-16']);
  });

  it('waits for delayed public places before enabling and focusing the requested infrastructure', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?h=ktp-16');
    render(PlaceMap, { props: { dataUrl: '/map/data/places.json' } });
    await waitFor(() => expect(window.ymaps3?.YMap).toHaveBeenCalled());
    expect((screen.getByRole('button', { name: 'Слои' }) as HTMLButtonElement).disabled).toBe(true);
    expect(map.update.mock.calls.some(([update]) => update.location?.center)).toBe(false);
    pending.resolve(
      Response.json({
        places: [
          {
            ...publicPlace,
            slug: 'ktp-16',
            mapLayer: 'infra',
            coordinates: infrastructure.coordinates
          }
        ]
      })
    );
    const checkbox = await ready();
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(map.update).toHaveBeenCalledWith({
      location: { center: [37.744332, 55.067389], zoom: 16, duration: 220, easing: 'ease-in-out' }
    });
  });

  it('enables the whole layer for a mixed set, frames only members and preserves manual visibility', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        Response.json(url === setUrl ? { ...definition, parcels: [parcel.code] } : [parcel])
      )
    );
    window.history.replaceState({ source: 'set' }, '', '/map/?flag&set=infrastructure#map');
    render(PlaceMap, { props: { places: [place, infrastructure, otherInfrastructure] } });
    const checkbox = await ready();
    await waitFor(() =>
      expect(map.update.mock.calls.some(([update]) => update.location?.bounds)).toBe(true)
    );
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(clusterIds()).toEqual([place.slug, otherInfrastructure.slug]);
    expect(
      map.update.mock.calls.find(([update]) => update.location?.bounds)?.[0].location.bounds
    ).toEqual(getSelectionSetBounds(ParcelMapPublicSchema.parse([parcel]), [infrastructure]));
    const calls = map.update.mock.calls.length;
    await fireEvent.click(checkbox);
    expect(clusterIds()).toEqual([place.slug]);
    await fireEvent.click(checkbox);
    expect(
      markerElements.filter((item) => item.getAttribute('href') === infrastructure.url).at(-1)
        ?.dataset.selectionSet
    ).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(clusterIds()).toEqual([place.slug, infrastructure.slug, otherInfrastructure.slug]);
    expect(map.update).toHaveBeenCalledTimes(calls);
    expect(window.location.search).toBe('?flag');
    expect(window.location.hash).toBe('#map');
  });

  it.each(['disable', 'clear', 'unmount'])(
    'does not resurrect infrastructure after a late set response on %s',
    async (action) => {
      const pending = Promise.withResolvers<Response>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => pending.promise)
      );
      window.history.replaceState({}, '', '/map/?set=infrastructure');
      const view = render(PlaceMap, { props: { places: [place, infrastructure] } });
      const checkbox = await ready();
      if (action === 'disable') {
        await fireEvent.click(checkbox);
        await fireEvent.click(checkbox);
      }
      if (action === 'clear')
        await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
      if (action === 'unmount') view.unmount();
      const calls = map.update.mock.calls.length;
      pending.resolve(Response.json(definition));
      await pending.promise;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect((checkbox as HTMLInputElement).checked).toBe(false);
      expect(map.update).toHaveBeenCalledTimes(calls);
      if (action === 'disable') {
        await fireEvent.click(checkbox);
        expect(markerElements.at(-1)?.dataset.selectionSet).toBe('true');
        expect(map.update).toHaveBeenCalledTimes(calls);
      }
    }
  );
});
