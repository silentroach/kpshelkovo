import { act, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { MapSelectionSetPublicDto } from '@/lib/map-selection-sets/public-types';

import PlaceMap from '../PlaceMap.svelte';
import { areaFeatures, map, markerElements, parcel, place, registerPlaceMapSetup } from './support';

vi.mock(import('@/lib/yandex-maps/runtime'), async (importOriginal) => ({
  ...(await importOriginal()),
  waitForStableLayout: async () => {},
  loadYandexMaps: async () => {
    await window.ymaps3?.ready;
  }
}));

const definition: MapSelectionSetPublicDto = {
  id: 'route-set',
  parcels: [parcel.code],
  places: [],
  outline: false,
  geometry: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [37.69, 55.08] },
        properties: { iconContent: '19', iconCaption: '<b>Finish</b>' }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [37.68, 55.04],
            [37.76, 55.075]
          ]
        },
        properties: { stroke: '#123456', 'stroke-width': 4 }
      }
    ]
  }
};
const setUrl = '/map/data/selection-sets/route-set.json';
const fitCalls = () => map.update.mock.calls.filter(([update]) => update.location?.bounds);
const routeMarker = () =>
  markerElements.find((element) => element.textContent === '19<b>Finish</b>');
const routeObjects = () => {
  const markers = vi.mocked(window.ymaps3!.YMapMarker);
  const marker =
    markers.mock.results[markers.mock.calls.findIndex(([, element]) => element === routeMarker())]
      ?.value;
  const line = areaFeatures.find(({ props }) => props.geometry.type === 'LineString');
  if (!marker || !line) throw new Error('Route objects missing');
  return [marker, line];
};
const requestSet = () =>
  vi.fn(async (url: string) => Response.json(url === setUrl ? definition : [parcel]));

describe('PlaceMap selection-set own geometry', () => {
  registerPlaceMapSetup();

  it('frames the route outside its parcel, keeps it through selection and layers, and clears only the set', async () => {
    vi.stubGlobal('fetch', requestSet());
    window.history.replaceState(
      { navigation: 'route' },
      '',
      '/map/?q=a%20b&flag&set=route-set#map'
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fitCalls()).toHaveLength(1));
    expect(fitCalls()[0]?.[0].location.bounds).toMatchInlineSnapshot(`
      [
        [
          37.656,
          55.028,
        ],
        [
          37.784,
          55.092,
        ],
      ]
    `);
    const objects = routeObjects();
    for (const object of objects) expect(map.addChild).toHaveBeenCalledWith(object);
    expect(routeMarker()?.querySelector('b')).toBeNull();
    expect(
      areaFeatures.find(({ props }) => props.geometry.type === 'LineString')?.props
    ).toMatchObject({
      geometry: definition.geometry?.features[1]?.geometry,
      style: { stroke: [{ color: '#123456', width: 4 }] }
    });
    const member = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')!;
    member.props.onClick?.({} as never, {} as never);
    for (const object of objects) expect(map.removeChild).not.toHaveBeenCalledWith(object);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    expect(map.removeChild).toHaveBeenCalledWith(member);
    for (const object of objects) expect(map.removeChild).not.toHaveBeenCalledWith(object);
    await fireEvent.click(river);
    const selectedMember = areaFeatures.findLast(({ props }) => props.id === 'parcel-SHR-L43')!;
    selectedMember.props.onClick?.({} as never, {} as never);
    const cameraCalls = map.update.mock.calls.length;
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    for (const object of objects) expect(map.removeChild).toHaveBeenCalledWith(object);
    expect(map.update).toHaveBeenCalledTimes(cameraCalls);
    expect({
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state
    }).toMatchInlineSnapshot(`
      {
        "hash": "#map",
        "search": "?q=a%20b&flag&p=SHR-L43",
        "state": {
          "navigation": "route",
        },
      }
    `);
    expect(selectedMember.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ width: 3 }]
    });
  });

  it.each(['p=SHR-L43', 'h=burzhuyka'])(
    'does not override the direct target %s with route bounds',
    async (target) => {
      vi.stubGlobal('fetch', requestSet());
      window.history.replaceState({}, '', `/map/?set=route-set&${target}`);
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() =>
        expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
      );
      for (const object of routeObjects()) expect(map.addChild).toHaveBeenCalledWith(object);
      expect(fitCalls()).toHaveLength(0);
    }
  );

  it.each(['clear', 'unmount'])('ignores a late route definition after %s', async (action) => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?set=route-set&flag');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(setUrl));
    if (action === 'clear')
      await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    else view.unmount();
    const adds = map.addChild.mock.calls.length;
    await act(async () => {
      pending.resolve(Response.json(definition));
      await pending.promise;
    });
    expect(map.addChild).toHaveBeenCalledTimes(adds);
    expect(routeMarker()).toBeUndefined();
    expect(areaFeatures).toHaveLength(0);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fitCalls()).toHaveLength(0);
  });

  it('removes both own objects on unmount', async () => {
    vi.stubGlobal('fetch', requestSet());
    window.history.replaceState({}, '', '/map/?set=route-set');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fitCalls()).toHaveLength(1));
    const objects = routeObjects();
    view.unmount();
    for (const object of objects) expect(map.removeChild).toHaveBeenCalledWith(object);
    expect(map.destroy).toHaveBeenCalledOnce();
  });

  it('rolls back the first own object when SDK addition of the second fails', async () => {
    vi.stubGlobal('fetch', requestSet());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    map.addChild.mockImplementation((object) => {
      if (object.props?.geometry?.type === 'LineString') throw new Error('Route line rejected');
    });
    window.history.replaceState({}, '', '/map/?set=route-set');
    render(PlaceMap, { props: { places: [place] } });
    expect((await screen.findByRole('alert')).textContent).toContain('Не удалось показать набор.');
    const [marker, line] = routeObjects();
    expect(map.addChild).toHaveBeenCalledWith(line);
    expect(map.removeChild).toHaveBeenCalledWith(marker);
    expect(markerElements.some((element) => element.getAttribute('href') === place.url)).toBe(true);
    expect(fitCalls()).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Снять набор' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(window.location.search).toBe('');
    map.addChild.mockReset();
  });
});
