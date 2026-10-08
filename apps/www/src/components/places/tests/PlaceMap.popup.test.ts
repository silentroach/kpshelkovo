import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PlaceMap from '../PlaceMap.svelte';
import {
  map,
  markerElements,
  mapElements,
  mapUpdateHandlers,
  mapClickHandlers,
  anchorElements,
  areaFeatures,
  place,
  parcel,
  details,
  parcelWithDetails,
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

  it('opens a permanent popup with the last price and exact area only for sale statuses', async () => {
    const reserved = { ...parcel, code: 'SHR-L45', status: 'reserved' as const };
    const sold = { ...parcel, code: 'SHR-L46', status: 'sold' as const };
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/details/SHR-L43.json')) return Response.json(details);
      if (url.endsWith('/details/SHR-L45.json'))
        return Response.json({
          ...details,
          code: reserved.code,
          status: 'reserved',
          price: { history: [] }
        });
      return Response.json([{ ...parcel, status: 'available' }, reserved, sold]);
    });
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(3));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    expect(screen.getByText(/10,51 сот\./)).toBeDefined();
    expect(screen.queryByTitle('Забронирован')).toBeNull();
    expect(window.location.search).toBe('?p=SHR-L43');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/details/SHR-L43.json'
    ]);

    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() => expect(screen.getByText('Нет данных о цене')).toBeDefined());
    expect(screen.getByTitle('Забронирован').getAttribute('aria-label')).toBe('Забронирован');
    areaFeatures[2]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('opens a direct alias popup without stealing focus or adding a history entry', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('/details/')
        ? Response.json(details)
        : Response.json([{ ...parcel, status: 'available' }])
    );
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') }));
    const state = { navigation: 'search' };
    window.history.replaceState(state, '', '/map/?q=a%20b&flag&p=shr-l44#map');
    const replace = vi.spyOn(window.history, 'replaceState');
    const push = vi.spyOn(window.history, 'pushState');
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('group', { name: 'Участок SHR-L43' });
    expect(document.activeElement).toBe(outside);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/map/data/parcels/shr.json',
      '/map/data/parcels/details/SHR-L43.json'
    ]);
    expect(replace.mock.lastCall).toEqual([state, '', '/map/?q=a%20b&flag&p=SHR-L43#map']);
    expect(
      map.update.mock.calls.find(([update]) => update.location?.zoom === 17)?.[0].location?.duration
    ).toBe(0);
    expect(push).not.toHaveBeenCalled();
    outside.remove();
  });

  it('announces missing values and retries HTTP and malformed JSON without losing selection', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([{ ...parcel, status: 'available' }]))
      .mockResolvedValueOnce(new Response(undefined, { status: 503 }))
      .mockResolvedValueOnce(new Response('{'))
      .mockResolvedValueOnce(
        Response.json({ ...details, area: undefined, price: { history: [] } })
      );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.getByText('Нет данных о площади')).toBeDefined());
    expect(screen.getByText('Нет данных о цене')).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects malformed numeric details and retries instead of caching them', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('/details/')
        ? Response.json(
            fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 1
              ? { ...details, area: 'bad' }
              : fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 2
                ? { ...details, price: { ...details.price, last: 'bad' } }
                : details
          )
        : Response.json([{ ...parcel, status: 'available' }])
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('alert');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('alert');
    await fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('reuses in-flight and successful details and ignores a late answer after closing', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.includes('/details/')
        ? pending.promise
        : Promise.resolve(Response.json([{ ...parcel, status: 'available' }]))
    );
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    await fireEvent.click(screen.getByRole('button', { name: 'Закрыть сведения об участке' }));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(fetch).toHaveBeenCalledTimes(2);
    pending.resolve(Response.json(details));
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
    await fireEvent.click(screen.getByRole('button', { name: 'Закрыть сведения об участке' }));
    expect(window.location.search).toBe('');
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    expect(fetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText(/12.000.000\s*₽/)).toBeDefined());
  });

  it('keeps the current area and price when previous details arrive late and reuses both snapshots', async () => {
    const pending = Promise.withResolvers<Response>();
    const secondParcel = { ...parcel, code: 'SHR-L45', status: 'reserved' as const };
    const secondDetails = {
      ...details,
      code: secondParcel.code,
      status: secondParcel.status,
      area: 800,
      price: { last: 9_000_000, history: [['2026-01-01', 9_000_000]] }
    };
    const fetch = vi.fn((url: string) => {
      if (url.endsWith('/details/SHR-L43.json')) return pending.promise;
      if (url.endsWith('/details/SHR-L45.json'))
        return Promise.resolve(Response.json(secondDetails));
      return Promise.resolve(Response.json([{ ...parcel, status: 'available' }, secondParcel]));
    });
    vi.stubGlobal('fetch', fetch);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByText(/9.000.000\s*₽/);
    expect(screen.getByText('8 сот.')).toBeDefined();

    pending.resolve(Response.json(details));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(screen.getByRole('group', { name: 'Участок SHR-L45' })).toBeDefined();
    expect(screen.getByText(/9.000.000\s*₽/)).toBeDefined();
    expect(screen.getByText('8 сот.')).toBeDefined();
    expect(screen.queryByText(/12.000.000\s*₽/)).toBeNull();

    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByText(/12.000.000\s*₽/);
    expect(screen.getByText(/10,51 сот\./)).toBeDefined();
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByText(/9.000.000\s*₽/);
    expect(screen.getByText('8 сот.')).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not restore a superseded popup when its details arrive late', async () => {
    const pending = Promise.withResolvers<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('/details/')
          ? pending.promise
          : Promise.resolve(
              Response.json([
                { ...parcel, status: 'available' },
                { ...parcel, code: 'SHR-L46', aliases: [], status: 'sold' }
              ])
            )
      )
    );
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    pending.resolve(Response.json(details));
    await Promise.resolve();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    expect(window.location.search).toBe('?p=SHR-L46');
    expect(areaFeatures[1]?.update.mock.lastCall?.[0].style).toMatchObject({
      fill: parcelSelectionColor
    });
  });

  it('ignores details arriving after the layer is disabled or the map unmounts', async () => {
    const first = Promise.withResolvers<Response>();
    const second = Promise.withResolvers<Response>();
    const fetch = vi.fn((url: string) =>
      url.includes('/details/')
        ? fetch.mock.calls.filter(([path]) => path.includes('/details/')).length === 1
          ? first.promise
          : second.promise
        : Promise.resolve(Response.json([{ ...parcel, status: 'available' }]))
    );
    vi.stubGlobal('fetch', fetch);
    const view = render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    await fireEvent.click(river);
    expect(window.location.search).toBe('');
    first.reject(new Error('Stale details request'));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(2));
    areaFeatures[1]?.props.onClick?.(new MouseEvent('click'), {} as never);
    await screen.findByRole('status');
    view.unmount();
    second.resolve(Response.json(details));
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull();
  });

  it('keeps the selection on drag and zoom but closes on a completed blank click', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    const canvas = mapElements[0]!;
    await fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    await fireEvent.pointerMove(canvas, { clientX: 90, clientY: 20 });
    mapClickHandlers[0]?.();
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.72, 55.07], zoom: 16, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20 });
    mapClickHandlers[0]?.();
    expect(window.location.search).toBe('');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Закрыть сведения об участке' })).toBeNull()
    );
  });

  it('moves keyboard focus into the popup and returns it to the label or map', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    mapUpdateHandlers[0]?.({
      type: 'update',
      location: { center: [37.715, 55.065], zoom: 17, bounds: map.bounds },
      camera: {},
      mapInAction: false
    });
    const label = markerElements.find((element) => element.title === parcel.code);
    const canvas = mapElements[0];
    if (!label || !canvas) throw new Error('Parcel label missing');
    canvas.append(label);
    label.focus();
    await fireEvent.click(label, { detail: 0 });
    const close = await screen.findByRole('button', { name: 'Закрыть сведения об участке' });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(close.closest('[aria-modal]')).toBeNull();
    expect(close.getAttribute('tabindex')).toBeNull();
    await fireEvent.keyDown(close, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    await fireEvent.click(close);
    expect(document.activeElement).toBe(label);

    await fireEvent.click(label, { detail: 0 });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Закрыть сведения об участке' })
      )
    );
    label.remove();
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(canvas);
    expect(window.location.search).toBe('');
  });

  it('keeps the parcel selected while Escape closes layers or a separate dialog', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    const river = screen.getByRole('checkbox', { name: 'Ривер' });
    await fireEvent.click(river);
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    river.focus();
    await fireEvent.keyDown(river, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(window.location.search).toBe('?p=SHR-L43');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;
    document.body.append(dialog);
    dialog.focus();
    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(window.location.search).toBe('?p=SHR-L43');
    dialog.remove();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(window.location.search).toBe('');
  });

  it('handles body Escape after a direct link without intercepting external controls', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    window.history.replaceState({}, '', '/map/?p=SHR-L43');
    render(PlaceMap, { props: { places: [place] } });
    await screen.findByRole('button', { name: 'Закрыть сведения об участке' });

    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    await fireEvent.keyDown(outside, { key: 'Escape' });
    expect(window.location.search).toBe('?p=SHR-L43');
    outside.remove();

    const layers = screen.getByRole('button', { name: 'Слои' });
    await fireEvent.click(layers);
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(layers.getAttribute('aria-expanded')).toBe('false');
    expect(window.location.search).toBe('?p=SHR-L43');
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(window.location.search).toBe('');
  });

  it('repositions and clamps the popup on map updates without moving camera or selection', async () => {
    vi.stubGlobal('fetch', parcelWithDetails);
    const canvasRect = { left: 10, top: 20, width: 420, height: 360 };
    const updateMap = () =>
      mapUpdateHandlers[0]?.({
        type: 'update',
        location: { center: [37.8, 55.1], zoom: 16, bounds: map.bounds },
        camera: {},
        mapInAction: false
      });
    render(PlaceMap, { props: { places: [place] } });
    await waitFor(() => expect(mapUpdateHandlers).toHaveLength(1));
    const canvas = mapElements[0]!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(
      () => ({ ...canvasRect }) as DOMRect
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Слои' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Ривер' }));
    await waitFor(() => expect(areaFeatures).toHaveLength(1));
    areaFeatures[0]?.props.onClick?.(new MouseEvent('click'), {} as never);
    const popup = (
      await screen.findByRole('button', { name: 'Закрыть сведения об участке' })
    ).closest<HTMLDivElement>('.parcel-map-popup');
    const anchor = anchorElements[0];
    if (!popup || !anchor) throw new Error('Popup anchor missing');
    Object.defineProperty(popup, 'offsetHeight', { configurable: true, value: 80 });
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 390, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 168px'));
    expect(popup.getAttribute('style')).toContain('top: 210.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow--down')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(window.location.search).toBe('?p=SHR-L43');
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 210, top: 100, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.querySelector('.parcel-map-popup__arrow--up')).toBeTruthy());
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 10, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 12px'));
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    canvasRect.height = 180;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 110, top: 110, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 140.5px'));
    expect(popup.getAttribute('style')).toContain('top: 50.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 330, top: 110, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('left: 40.5px'));
    expect(popup.getAttribute('style')).toContain('top: 50.5px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    canvasRect.width = 220;
    canvasRect.height = 130;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 120, top: 90, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('top: 32.5px'));
    expect(popup.getAttribute('style')).toContain('left: 12px');
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
    expect(window.location.search).toBe('?p=SHR-L43');
    canvasRect.width = 300;
    canvasRect.height = 180;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: -50, top: -50, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.getAttribute('style')).toContain('top: 45px'));
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();

    canvasRect.width = 420;
    canvasRect.height = 360;
    Object.defineProperty(popup, 'offsetWidth', { configurable: true, value: 360 });
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 418, top: 350, width: 1, height: 1 }) as DOMRect
    );
    updateMap();
    await waitFor(() => expect(popup.style.left).toBe('48px'));
    expect(Number.parseFloat(popup.style.left) + popup.offsetWidth).toBeLessThanOrEqual(
      canvasRect.width - 12
    );
    expect(popup.querySelector('.parcel-map-popup__arrow')).toBeNull();
  });
});
