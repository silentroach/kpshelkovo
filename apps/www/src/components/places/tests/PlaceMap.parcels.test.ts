import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import PlaceMap from '../PlaceMap.svelte';
import {
  clustererProps,
  map,
  nativeControl,
  markerElements,
  markerLocations,
  mapElements,
  mapUpdateHandlers,
  mapClickHandlers,
  areaFeatures,
  mapProps,
  place,
  titanicPlace,
  parcel,
  parcelContours,
  parcelFetch,
  parcelSelectionColor,
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

  it('loads parcel geometry only when switched on, reuses it after switching off and keeps places', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    expect(parcelFetch).not.toHaveBeenCalled();

    const layers = screen.getByRole('button', { name: 'Слои' });
    expect(layers.textContent?.trim()).toBe('');
    expect(layers.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    await fireEvent.click(layers);
    expect(parcelFetch).not.toHaveBeenCalled();
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    expect(screen.getByRole('checkbox', { name: 'Участки' })).toBeDefined();
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.checked).toBe(false);
    await fireEvent.click(toggle);
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    expect(mapProps[0]?.location.bounds).toEqual([
      [37.715242, 55.059526],
      [37.717242, 55.061526]
    ]);

    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    expect(toggle.checked).toBe(true);
    expect(layers.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(toggle);
    expect(map.removeChild).toHaveBeenCalledWith(feature);
    await fireEvent.click(toggle);
    expect(parcelFetch).toHaveBeenCalledTimes(1);
    expect(markerElements[0]?.getAttribute('href')).toBe(place.url);
    expect(map.addChild).toHaveBeenCalledWith(nativeControl);
  });

  it('lets each part finish independently and keeps neighbouring contours when one is hidden', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const park = { ...parcel, code: 'SHP-B42', aliases: [], part: 'shp' };
    const forestResponse = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.endsWith('/shf.json') ? forestResponse.promise : Promise.resolve(Response.json([park]))
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    const parkToggle = screen.getByRole('checkbox', { name: 'Парк' }) as HTMLInputElement;
    expect(screen.getAllByRole('checkbox').map((input) => input.parentElement?.textContent?.trim()))
      .toMatchInlineSnapshot(`
        [
          "Участки",
          "Форест",
          "Вилладж",
          "Парк",
          "Ривер",
        ]
      `);
    expect(all.indeterminate).toBe(false);
    await fireEvent.click(forestToggle);
    await fireEvent.click(parkToggle);
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHP-B42')).toBe(true)
    );
    expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHF-M1')).toBe(false);
    expect(all.indeterminate).toBe(true);
    const parkFeature = areaFeatures.find(({ props }) => props.id === 'parcel-SHP-B42');
    await fireEvent.click(parkToggle);
    expect(map.removeChild).toHaveBeenCalledWith(parkFeature);
    forestResponse.resolve(Response.json([forest]));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHF-M1')).toBe(true)
    );
    const forestFeature = areaFeatures.find(({ props }) => props.id === 'parcel-SHF-M1');
    expect(map.removeChild).not.toHaveBeenCalledWith(forestFeature);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shp.json'
    ]);
    await fireEvent.click(all);
    await waitFor(() => expect(all.checked).toBe(true));
    await fireEvent.click(all);
    expect(all.checked).toBe(false);
    expect(forestToggle.checked).toBe(false);
    expect(map.removeChild).toHaveBeenCalledWith(forestFeature);
  });

  it('keeps all four parts in one layer when their requests finish together', async () => {
    const codes = { shf: 'SHF-M1', shv: 'SHV-V1', shp: 'SHP-B42', shr: 'SHR-L43' } as const;
    const fetch = vi.fn(async (url: string) => {
      const part = url.match(/\/(shf|shv|shp|shr)\.json$/)?.[1] as keyof typeof codes;
      return Response.json([{ ...parcel, code: codes[part], aliases: [], part }]);
    });
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    await fireEvent.click(all);
    await waitFor(() => expect(areaFeatures).toHaveLength(4));
    expect(fetch).toHaveBeenCalledTimes(4);
    await fireEvent.click(all);
    for (const feature of areaFeatures) expect(map.removeChild).toHaveBeenCalledWith(feature);
  });

  it('renders the four decorative area icons and toggles every checkbox with its label', async () => {
    const icons = Object.fromEntries(
      ['forest', 'village', 'park', 'river'].map((name) => [
        name,
        createRawSnippet(() => ({ render: () => `<svg data-area="${name}"></svg>` }))
      ])
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place], ...icons } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const all = checkboxes[0]!;
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([
      false,
      false,
      false,
      false,
      false
    ]);
    expect(checkboxes.map((checkbox) => checkbox.parentElement?.textContent?.trim()))
      .toMatchInlineSnapshot(`
        [
          "Участки",
          "Форест",
          "Вилладж",
          "Парк",
          "Ривер",
        ]
      `);
    expect(
      checkboxes.slice(1).map((checkbox) => ({
        icon: checkbox.parentElement?.querySelector('svg')?.getAttribute('data-area'),
        decorative: checkbox.parentElement
          ?.querySelector('[aria-hidden]')
          ?.getAttribute('aria-hidden')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "decorative": "true",
          "icon": "forest",
        },
        {
          "decorative": "true",
          "icon": "village",
        },
        {
          "decorative": "true",
          "icon": "park",
        },
        {
          "decorative": "true",
          "icon": "river",
        },
      ]
    `);
    for (const checkbox of checkboxes.slice(1)) {
      await fireEvent.click(checkbox.parentElement!);
      expect(checkbox.checked).toBe(true);
    }
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    await fireEvent.click(all.parentElement!);
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([
      false,
      false,
      false,
      false,
      false
    ]);
    expect(screen.getByRole('button', { name: 'Слои' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a non-numeric selection marker on the layers trigger while any part is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    const marker = (): HTMLSpanElement | undefined =>
      layers.querySelector<HTMLSpanElement>('span[aria-hidden="true"]') ?? undefined;
    expect(marker()).toBeUndefined();
    await fireEvent.click(layers);
    const forest = screen.getByRole('checkbox', { name: 'Форест' });
    const park = screen.getByRole('checkbox', { name: 'Парк' });
    await fireEvent.click(forest);
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(layers);
    await fireEvent.click(park);
    await fireEvent.click(forest);
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(marker()?.textContent).toBe('✓');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(marker()).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Слои' })).toBe(layers);
  });

  it('exposes the mixed checkbox state and keeps keyboard selection and camera', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const all = screen.getByRole('checkbox', { name: 'Участки' }) as HTMLInputElement;
    const forest = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    forest.focus();
    await fireEvent.keyDown(forest, { key: ' ' });
    await fireEvent.click(forest, { detail: 0 }); // Native checkbox keyboard activation
    expect(document.activeElement).toBe(forest);
    expect(forest.checked).toBe(true);
    expect(all.indeterminate).toBe(true);
    const cameraUpdates = map.update.mock.calls.length;
    await fireEvent.click(all);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(map.update).toHaveBeenCalledTimes(cameraUpdates);
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(layers);
  });

  it('selects a parcel across parts without replacing either part or moving the camera', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shf.json') ? [forest] : [parcel]))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Форест' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    const first = areaFeatures.find(({ props }) => props.id === 'parcel-SHF-M1');
    const second = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    const calls = map.update.mock.calls.length;
    first?.props.onClick?.(new MouseEvent('click'), {} as never);
    second?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(first?.update.mock.lastCall?.[0].style).toEqual(first?.props.style);
    expect(second?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    expect(map.update.mock.calls).toHaveLength(calls);
    expect(map.removeChild).not.toHaveBeenCalledWith(first);
  });

  it('closes the layer list outside and on Escape, returning keyboard focus', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));

    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    toggle.focus();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(layers);

    await fireEvent.click(layers);
    await fireEvent.pointerDown(document.body);
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(parcelFetch).not.toHaveBeenCalled();
  });

  it('ignores a parcel response after the part is disabled or the component unmounts', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(toggle.checked).toBe(false));
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();

    const later = Promise.withResolvers<Response>();
    fetch.mockReturnValue(later.promise);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Парк' }));
    view.unmount();
    later.resolve(Response.json([parcel]));
    await Promise.resolve();
    expect(areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')).toBeUndefined();
  });

  it('reuses one in-flight request when a part is turned off and on before its response', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(toggle);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    expect(fetch).toHaveBeenCalledOnce();
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(toggle.checked).toBe(true);
  });

  it('offers a retry after a failed manual request', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockResolvedValueOnce(Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await screen.findByRole('alert');
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
    ).toBeNull();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() =>
      expect(areaFeatures.some(({ props }) => props.id === 'parcel-SHR-L43')).toBe(true)
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports one part failure without hiding a ready part, then retries through its checkbox', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const fetch = vi
      .fn()
      .mockImplementationOnce(async () => Response.json([forest]))
      .mockImplementationOnce(async () => new Response(undefined, { status: 503 }))
      .mockImplementationOnce(async () => Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    const riverToggle = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    await fireEvent.click(forestToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.click(riverToggle);
    expect((await screen.findByRole('alert')).textContent).toContain('Ривер');
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
        ?.textContent
    ).toBe('✓');
    expect(forestToggle.checked).toBe(true);
    expect(riverToggle.checked).toBe(false);
    expect(riverToggle.getAttribute('aria-invalid')).toBe('true');
    expect(riverToggle.getAttribute('aria-describedby')).toBe('parcel-map-error-shr');
    expect(riverToggle.parentElement?.textContent).toContain('!');
    expect(screen.queryByText(/Загружаем участки|Повторить/)).toBeNull();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alert').textContent).toContain('Ривер');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(riverToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rolls back partially added objects when applying one part fails', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const second = { ...parcel, code: 'SHF-M2', aliases: [], part: 'shf' };
    const fetch = vi.fn(async (url: string) =>
      Response.json(url.endsWith('shf.json') ? [forest, second] : [parcel])
    );
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    const ready = areaFeatures[0];
    map.addChild
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('SDK failed to add feature');
      });
    const forestToggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    await fireEvent.click(forestToggle);
    await screen.findByRole('alert');
    expect(forestToggle.checked).toBe(false);
    expect(map.removeChild).toHaveBeenCalledWith(areaFeatures[1]);
    expect(map.removeChild).toHaveBeenCalledWith(areaFeatures[2]);
    expect(map.removeChild).not.toHaveBeenCalledWith(ready);
    await fireEvent.click(forestToggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(5));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shf.json'
    ]);
  });

  it.each([
    parcel.geometry,
    { type: 'MultiPolygon', coordinates: [parcelContours[0], parcelContours[2]] }
  ])(
    'shows only the primary label from zoom 17 for one cadastral $type with an alias',
    async (geometry) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json([{ ...parcel, geometry }]))
      );
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
      await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
      await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
      await waitFor(() => expect(areaFeatures).toHaveLength(1));
      const update = mapUpdateHandlers[0];
      if (!update) throw new Error('Map listener missing');
      expect(markerElements.some((element) => element.classList.contains('parcel-map-label'))).toBe(
        false
      );
      update({
        type: 'update',
        location: {
          center: [37.715, 55.065],
          zoom: 17,
          bounds: [
            [37.7, 55.08],
            [37.8, 55.04]
          ]
        },
        camera: {},
        mapInAction: false
      });
      const label = markerElements.find((element) =>
        element.classList.contains('parcel-map-label')
      );
      if (!label) throw new Error('Parcel label missing');
      expect({
        text: label.textContent,
        title: label.title,
        name: label.getAttribute('aria-label')
      }).toMatchInlineSnapshot(`
        {
          "name": "Выбрать участок SHR-L43",
          "text": "L43",
          "title": "SHR-L43",
        }
      `);
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(1);
      expect(areaFeatures[0]?.props.geometry).toEqual(geometry);
      const labelIndex = markerElements.indexOf(label);
      const labelCoordinates = markerLocations[labelIndex]?.coordinates;
      expect(labelCoordinates).toEqual([37.715, 55.065]);
      const labelMarker = map.addChild.mock.lastCall?.[0];
      await fireEvent.click(label);
      expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
        fill: parcelSelectionColor
      });
      expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();

      update({
        type: 'update',
        location: { center: [37.715, 55.065], zoom: 16, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      expect(map.removeChild).toHaveBeenCalledWith(labelMarker);
    }
  );

  it('selects both contours without extra text for a compound position', async () => {
    const group = {
      ...parcel,
      code: 'SHR-E35',
      aliases: [],
      multipleCadastralParcels: true,
      geometry: {
        type: 'MultiPolygon',
        coordinates: parcelContours.slice(0, 2)
      }
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([group, parcel]))
    );
    window.history.replaceState({}, '', '/map/?p=SHR-E35');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    const feature = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-E35');
    expect(feature?.props.geometry).toMatchObject({
      type: 'MultiPolygon',
      coordinates: parcelContours.slice(0, 2)
    });
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    const markersBeforeSelection = markerElements.length;
    feature?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(markerElements).toHaveLength(markersBeforeSelection);
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });

    expect(window.location.search).toBe('?p=SHR-E35');
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find(
      (element) => element.classList.contains('parcel-map-label') && element.title === 'SHR-E35'
    );
    if (!label) throw new Error('group label missing');
    expect({
      text: label.textContent,
      title: label.title,
      name: label.getAttribute('aria-label')
    }).toMatchInlineSnapshot(`
      {
        "name": "Выбрать участок SHR-E35",
        "text": "E35",
        "title": "SHR-E35",
      }
    `);
    await fireEvent.click(label);
    expect(markerElements.every((element) => !element.classList.contains('parcel-map-hint'))).toBe(
      true
    );
    expect(feature?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    const single = areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43');
    single?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(single?.update.mock.lastCall?.[0].style).toMatchObject({ fill: parcelSelectionColor });
    expect(feature?.update.mock.lastCall?.[0].style).toEqual(feature?.props.style);
  });

  it.each([
    ['shr-k40', 'SHR-K41'],
    ['shr-k2', 'SHR-K19'],
    ['shr-k10', 'SHR-K19']
  ])(
    'labels two-to-three and three-to-three groups and selects the whole group via alias %s',
    async (alias, code) => {
      const groups = [
        { ...parcel, code: 'SHR-K41', aliases: ['SHR-K40'] },
        { ...parcel, code: 'SHR-K19', aliases: ['SHR-K10', 'SHR-K2'] }
      ].map((item) => ({
        ...item,
        multipleCadastralParcels: true,
        geometry: { type: 'MultiPolygon', coordinates: parcelContours }
      }));
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(groups))
      );
      window.history.replaceState({}, '', `/map/?p=${alias}`);
      render(PlaceMap, { props: { places: [place] } });
      await waitFor(() => expect(areaFeatures).toHaveLength(2));
      const selected = areaFeatures.find(({ props }) => props.id === `parcel-${code}`);
      expect(selected?.update.mock.lastCall?.[0].style).toMatchObject({
        fill: parcelSelectionColor
      });
      expect(window.location.search).toBe(`?p=${code}`);
      expect(map.update.mock.lastCall?.[0].location).toMatchObject({
        center: parcel.labelCoordinates,
        zoom: 17
      });
      expect(areaFeatures.map(({ props }) => props.geometry)).toEqual(
        groups.map(({ geometry }) => geometry)
      );
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(0);

      const update = mapUpdateHandlers[0];
      const canvas = mapElements[0];
      if (!update || !canvas) throw new Error('Map missing');
      map.zoom = 17;
      update({
        type: 'update',
        location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
      const labels = markerElements.filter((element) =>
        element.classList.contains('parcel-map-label')
      );
      expect(
        labels.map((label) => ({
          tag: label.tagName,
          text: label.textContent,
          title: label.title,
          name: label.getAttribute('aria-label')
        }))
      ).toMatchInlineSnapshot(`
        [
          {
            "name": "Выбрать участок SHR-K41 / SHR-K40",
            "tag": "BUTTON",
            "text": "K41/K40",
            "title": "SHR-K41 / SHR-K40",
          },
          {
            "name": "Выбрать участок SHR-K19 / SHR-K2 / SHR-K10",
            "tag": "BUTTON",
            "text": "K19/K2/K10",
            "title": "SHR-K19 / SHR-K2 / SHR-K10",
          },
        ]
      `);
      canvas.append(...labels);
      map.update.mockClear();
      for (const [index, group] of groups.entries()) {
        await fireEvent.keyDown(document, { key: 'Escape' });
        const label = labels[index];
        const feature = areaFeatures[index];
        if (!label || !feature) throw new Error('Group missing');
        label.focus();
        await fireEvent.click(label, { detail: 0 });
        expect(document.activeElement).toBe(label);
        expect(window.location.search).toBe(`?p=${group.code}`);
        expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
          fill: parcelSelectionColor
        });

        await fireEvent.keyDown(label, { key: 'Escape' });
        expect(feature.update.mock.lastCall?.[0].style).toEqual(feature.props.style);
        feature.props.onClick?.(new MouseEvent('click'), {} as never);
        expect(window.location.search).toBe(`?p=${group.code}`);
        expect(feature.update.mock.lastCall?.[0].style).toMatchObject({
          fill: parcelSelectionColor
        });
      }
      expect(map.update).not.toHaveBeenCalled();
      expect(
        markerElements.filter((element) => element.classList.contains('parcel-map-label'))
      ).toHaveLength(2);
    }
  );

  it('shades known sale statuses only while restoring each parcel after selection', async () => {
    const parcels = (['available', 'reserved', 'unavailable', 'sold', undefined] as const).map(
      (status, index) => ({
        ...parcel,
        code: `SHR-L${43 + index}`,
        status,
        labelCoordinates: [37.715 + index * 0.001, 55.065]
      })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(parcels))
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(5));

    expect(
      areaFeatures.map(({ props }) => ({
        id: props.id,
        fill: props.style?.fill,
        opacity: props.style?.fillOpacity
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "fill": "#d6a22a",
          "id": "parcel-SHR-L43",
          "opacity": 0.22,
        },
        {
          "fill": "#d6a22a",
          "id": "parcel-SHR-L44",
          "opacity": 0.22,
        },
        {
          "fill": "oklch(88% 0 0)",
          "id": "parcel-SHR-L45",
          "opacity": 0.25,
        },
        {
          "fill": undefined,
          "id": "parcel-SHR-L46",
          "opacity": 0,
        },
        {
          "fill": undefined,
          "id": "parcel-SHR-L47",
          "opacity": 0,
        },
      ]
    `);
    expect(
      markerElements.filter((element) => element.classList.contains('parcel-map-label'))
    ).toHaveLength(0);
    expect(markerElements[0]?.getAttribute('href')).toBe(place.url);

    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const unavailable = markerElements.find((element) => element.title === 'SHR-L45');
    const available = markerElements.find((element) => element.title === 'SHR-L43');
    if (!unavailable || !available) throw new Error('Parcel labels missing');
    expect(unavailable.classList.contains('parcel-map-label--unavailable')).toBe(true);
    expect(unavailable.getAttribute('aria-label')).toBe('Выбрать участок SHR-L45');
    expect(available.classList.contains('parcel-map-label--unavailable')).toBe(false);
    expect(areaFeatures[2]?.props.style?.stroke?.[0]?.opacity).toBe(0.2);

    await fireEvent.click(unavailable);
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
    await fireEvent.click(available);
    expect(areaFeatures[2]?.update.mock.lastCall?.[0].style).toEqual(areaFeatures[2]?.props.style);
    for (const feature of areaFeatures) {
      feature.props.onClick?.(new MouseEvent('click'), {} as never);
      const selectedStyle = feature.update.mock.lastCall?.[0].style;
      expect(selectedStyle).toMatchObject({
        fill: parcelSelectionColor,
        stroke: [{ color: parcelSelectionColor }]
      });
      expect(selectedStyle?.stroke[0].width).toBeGreaterThan(
        feature.props.style?.stroke?.[0]?.width ?? 0
      );
      expect(feature.update.mock.lastCall?.[0].style).toEqual(selectedStyle);
      await fireEvent.pointerDown(mapElements[0]!);
      mapClickHandlers[0]?.();
      expect(feature.update.mock.lastCall?.[0].style).toEqual(feature.props.style);
    }
  });

  it('replaces permanent parcel selection and clears it on Escape', async () => {
    const secondParcel = {
      code: 'SHR-L46',
      part: parcel.part,
      geometry: parcel.geometry,
      labelCoordinates: [37.73, 55.065]
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([parcel, secondParcel]))
    );
    const timeout = vi.spyOn(window, 'setTimeout');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(areaFeatures.map(({ props }) => props.style?.stroke)).toMatchInlineSnapshot(`
      [
        [
          {
            "color": "#64748b",
            "opacity": 0.5,
            "width": 1,
          },
        ],
        [
          {
            "color": "#64748b",
            "opacity": 0.5,
            "width": 1,
          },
        ],
      ]
    `);
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });

    const firstLabel = markerElements.find((element) => element.title === parcel.code);
    const secondLabel = markerElements.find((element) => element.title === secondParcel.code);
    if (!firstLabel || !secondLabel) throw new Error('Parcel labels missing');
    await fireEvent.click(firstLabel);
    await fireEvent.click(secondLabel);
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(timeout.mock.calls.some(([, delay]) => delay === 5_000)).toBe(false);
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#64748b', width: 1, opacity: 0.5 }]
    });
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Слои' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      stroke: [{ color: '#64748b', width: 1, opacity: 0.5 }]
    });
    expect(window.location.search).toBe('');
    view.unmount();
  });

  it('focuses alias links from the geometry feed, survives resize, and preserves URL state', async () => {
    const fetch = vi.fn((url: string) =>
      url === '/map/data/parcels/shr.json'
        ? Promise.resolve(
            Response.json([
              {
                ...parcel,
                geometry: {
                  type: 'MultiPolygon',
                  coordinates: [
                    parcel.geometry.coordinates,
                    [
                      [
                        [37.8, 55.08],
                        [37.81, 55.08],
                        [37.81, 55.09],
                        [37.8, 55.08]
                      ]
                    ]
                  ]
                }
              }
            ])
          )
        : parcelFetch(url)
    );
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') }));
    const historyState = { navigation: 'parcel' };
    window.history.replaceState(historyState, '', '/map/?q=a%20b&flag&p=shr-l44&h=burzhuyka#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() =>
      expect(
        areaFeatures.find(({ props }) => props.id === 'parcel-SHR-L43')?.update
      ).toHaveBeenCalled()
    );
    expect(screen.queryByText('SHR-L43 / SHR-L44')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Слои' }).querySelector('span[aria-hidden="true"]')
        ?.textContent
    ).toBe('✓');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    expect(map.update.mock.calls.find(([props]) => props.location?.zoom === 17)?.[0])
      .toMatchInlineSnapshot(`
        {
          "location": {
            "center": [
              37.715,
              55.065,
            ],
            "duration": 0,
            "easing": "ease-in-out",
            "zoom": 17,
          },
        }
      `);
    expect(markerElements[0]?.dataset.highlighted).toBeUndefined();

    const count = map.update.mock.calls.length;
    document.dispatchEvent(new Event('astro:page-load'));
    await waitFor(() => expect(map.update.mock.calls.length).toBe(count));

    expect(window.location.search).toBe('?q=a%20b&flag&h=burzhuyka&p=SHR-L43');
    await fireEvent.keyDown(document, { key: 'Escape' });
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(replace.mock.lastCall).toEqual([historyState, '', '/map/?q=a%20b&flag&h=burzhuyka#map']);
    document.dispatchEvent(new Event('astro:page-load'));
    expect(map.update.mock.calls.length).toBe(count);
  });

  it('clears the direct link after selecting a different parcel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          parcel,
          { ...parcel, code: 'SHR-L46', aliases: [], labelCoordinates: [37.73, 55.065] }
        ])
      )
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place] } });

    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find((element) => element.title === 'SHR-L46');
    if (!label) throw new Error('Second parcel label missing');
    await fireEvent.click(label);

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/map/?flag&p=SHR-L46#map'
    );
  });

  it('does not focus a late direct-link response after another selection', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('shf.json') ? pending.promise : Promise.resolve(Response.json([parcel]))
      )
    );
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Слои' }) as HTMLButtonElement).disabled).toBe(
        false
      )
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);

    expect(window.location.search).toBe('?flag&p=SHR-L43');

    pending.resolve(Response.json([forest]));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
    expect(window.location.search).toBe('?flag&p=SHR-L43');
  });

  it('cancels a pending direct link on a blank map click', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/map/data/parcels/shr.json'));

    mapClickHandlers[0]?.(undefined);
    expect(window.location.search).toBe('?flag');

    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(areaFeatures[0]?.update).not.toHaveBeenCalled();
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
  });

  it('clears a direct link when the replacement selection is disabled', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shf.json') ? [forest] : [parcel]))
    );
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await fireEvent.click(river);

    expect(window.location.search).toBe('?flag');
    expect(map.removeChild).not.toHaveBeenCalledWith(areaFeatures[0]);
  });

  it('uses the label zoom for a direct link to a small parcel', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.find(([props]) => props.location?.zoom === 17)?.[0]).toMatchObject(
      {
        location: { center: parcel.labelCoordinates, zoom: 17 }
      }
    );
  });

  it('does not restart an active direct-link focus when selecting all parts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => Response.json(url.endsWith('shr.json') ? [parcel] : []))
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&other=1');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    expect(map.update.mock.calls.filter(([update]) => update.location?.zoom === 17)).toHaveLength(
      1
    );
    expect(window.location.search).toBe('?p=SHR-L43&other=1');
  });

  it('repeats an original parcel link on remount but opens the cleaned URL with no parts', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    const original = '/map/?q=a%20b&flag&p=SHR-L43#map';
    window.history.replaceState({}, '', original);
    const first = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    await fireEvent.keyDown(document, { key: 'Escape' });
    const cleaned = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    expect(cleaned).toBe('/map/?q=a%20b&flag#map');
    first.unmount();

    window.history.replaceState({}, '', original);
    const second = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(parcelFetch).toHaveBeenCalledTimes(2);
    second.unmount();

    window.history.replaceState({}, '', cleaned);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(3));
    expect(parcelFetch).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      false
    );
  });

  it('routes a mixed-case alias through only its part and ignores malformed codes', async () => {
    const park = { ...parcel, code: 'SHP-B42', aliases: ['SHP-B43'], part: 'shp' };
    const fetch = vi.fn(async (_url: string) => Response.json([park]));
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=shp-b43');
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shp.json']);
    expect(areaFeatures[0]?.props.id).toBe('parcel-SHP-B42');
    view.unmount();

    fetch.mockClear();
    window.history.replaceState({}, '', '/map/?p=SHF-wrong');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(2));
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cancels an in-flight direct link when its part is switched off', async () => {
    const forest = { ...parcel, code: 'SHF-M1', aliases: [], part: 'shf' };
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHF-M1&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const toggle = screen.getByRole('checkbox', { name: 'Форест' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await fireEvent.click(toggle);
    expect(`${window.location.search}${window.location.hash}`).toBe('?flag#map');
    pending.resolve(Response.json([forest]));
    await Promise.resolve();
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(toggle);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch).toHaveBeenCalledOnce();
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(false);
  });

  it('cancels a pending parcel link when selecting a place', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    const selected = markerElements[0];
    if (!selected) throw new Error('Map marker missing');
    await fireEvent.click(selected);
    expect(new URL(window.location.href).searchParams.has('p')).toBe(false);
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(false);
  });

  it('keeps a pending parcel link when zooming into a place cluster', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending.promise)
    );
    window.history.replaceState({}, '', '/map/?p=SHR-L43&flag#map');
    render(PlaceMap, { props: { places: [place, titanicPlace] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    const clusterer = clustererProps[0]!;
    clusterer.cluster([37.74, 55.06], clusterer.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker missing');
    await fireEvent.click(cluster);
    expect(window.location.search).toBe('?p=SHR-L43&flag');

    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    expect(map.update.mock.calls.some(([props]) => props.location?.zoom === 17)).toBe(true);
  });

  it('cancels an active URL highlight without a late focus or URL mutation', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    const historyState = { navigation: 'parcel' };
    window.history.replaceState(historyState, '', '/map/?p=SHR-L43&flag#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(areaFeatures[0]?.update).toHaveBeenCalled());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    expect(replace.mock.lastCall).toEqual([historyState, '', '/map/?flag#map']);
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    expect(map.update.mock.calls.filter(([update]) => update.location?.zoom === 17)).toHaveLength(
      1
    );
    expect(parcelFetch).toHaveBeenCalledOnce();
  });

  it('discards an unknown link after loading geometry without changing layer visibility', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect(parcelFetch.mock.calls.map(([url]) => url)).toEqual(['/map/data/parcels/shr.json']);
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      false
    );
    expect(areaFeatures).toHaveLength(0);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(parcelFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps a direct-link intent after a failed geometry request and retries it', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L44&from=search');
    render(PlaceMap, { props: { places: [place] } });

    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L44&from=search');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shr.json'
    ]);
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
  });

  it('keeps a requested link when applying its part fails, then focuses after a retry', async () => {
    const fetch = vi.fn(async () => Response.json([parcel]));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L44&other=1#map');
    map.update.mockImplementationOnce(() => {
      throw new Error('SDK focus unavailable');
    });
    render(PlaceMap, { props: { places: [place] } });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ривер');
    expect(window.location.search).toBe('?p=SHR-L44&other=1');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement;
    expect(river.checked).toBe(false);
    await fireEvent.click(river);
    await waitFor(() =>
      expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true)
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(window.location.search).toBe('?other=1&p=SHR-L43');
  });

  it('preserves an explicit group selection if a pending direct code turns out unknown', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.endsWith('/shr.json') ? pending.promise : Promise.resolve(Response.json([]))
    );
    vi.stubGlobal('fetch', fetch);
    window.history.replaceState({}, '', '/map/?p=SHR-L99&flag#map');
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Участки' }));
    pending.resolve(Response.json([parcel]));
    await waitFor(() => expect(window.location.search).toBe('?flag'));
    expect((screen.getByRole('checkbox', { name: 'Ривер' }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shf.json',
      '/map/data/parcels/shv.json',
      '/map/data/parcels/shp.json'
    ]);
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(false);
  });

  it('retries after an invalid wrapper causes an application error', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ parcels: [] }))
      .mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });

    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(map.update.mock.calls.some(([update]) => update.location?.zoom === 17)).toBe(true);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/shr.json'
    ]);
  });

  it('retries a failed JSON response without caching it', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{')).mockImplementation(parcelFetch);
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(markerElements).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the selected parcel and its link while zooming into a place cluster', async () => {
    vi.stubGlobal('fetch', parcelFetch);
    render(PlaceMap, { props: { places: [place, titanicPlace] } });
    await waitFor(() => expect(clustererProps).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);

    const clusters = clustererProps[0]!;
    clusters.cluster([37.74, 55.06], clusters.features);
    const cluster = markerElements.at(-1);
    if (!cluster) throw new Error('Cluster marker missing');
    await fireEvent.click(cluster);

    expect(map.update.mock.lastCall?.[0].location.bounds).toBeDefined();
    expect(window.location.search).toBe('?p=SHR-L43');
    expect(areaFeatures[0]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
  });
});
