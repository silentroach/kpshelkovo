<script lang="ts">
  import { pluralize } from '@shelkovo/format';
  import type { Feature } from '@yandex/ymaps3-clusterer';
  import type {
    DrawingStyle,
    LngLat,
    MultiPolygonGeometry,
    PolygonGeometry,
  } from '@yandex/ymaps3-types';
  import {
    APPLE_MARKER,
    ANIMALS_MARKER,
    CONSTRUCTION_MARKER,
    FISH_MARKER,
    FOODTRUCK_MARKER,
    KPP_MARKER,
    TITANIC_MARKER,
  } from '@shelkovo/ui/markers';
  import { onMount } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  import {
    installYandexMapsRuntimeHeadPersistence,
    loadYandexMaps,
    waitForStableLayout,
  } from '@/lib/yandex-maps/runtime';
  import { getPlaceClosingTime } from '@/lib/places/opening-hours';
  import type {
    PlaceMapItem,
    PlaceMapPayload,
    PlaceMapProps,
  } from '@/lib/places/map-types';
  import { PLACE_MAP_BOUNDS } from '@/lib/places/schema';
  import type { PlaceMarker } from '@/lib/places/schema';
  import type {
    PlaceGeometryPosition,
    PlacePolygonGeometry,
  } from '@/lib/places/types';
  import { formatPlaceStatus } from '@/lib/places/view';

  let {
    dataUrl = '',
    fallbackPlace,
    places = [] as readonly PlaceMapItem[],
  }: PlaceMapProps = $props();

  const SETTLEMENT_BOUNDS: ymaps3.LngLatBounds = [
    [PLACE_MAP_BOUNDS.minLng, PLACE_MAP_BOUNDS.minLat],
    [PLACE_MAP_BOUNDS.maxLng, PLACE_MAP_BOUNDS.maxLat],
  ];
  const VIEW_MARGIN: ymaps3.Margin = [112, 80, 32, 80];
  const MOBILE_VIEW_MARGIN: ymaps3.Margin = [112, 32, 32, 32];
  const BOUNDS_PADDING_RATIO = 0.3;
  const CLUSTER_GRID_SIZE = 48;
  const CLUSTER_ZOOM_DURATION_MS = 220;
  const HIGHLIGHT_DURATION_MS = 5_000;
  const HIGHLIGHT_QUERY_PARAM = 'h';
  const AREA_HOVER_LEAVE_DELAY_MS = 80;
  const MARKER_MIN_SCALE = 20 / 32;
  const MARKER_MIN_ZOOM = 13.5;
  const MARKER_MAX_ZOOM = 16;
  const MARKER_CLOSEUP_MAX_ZOOM = 18;
  const MARKER_CLOSEUP_MAX_SCALE = 1.3;
  const PLACE_FOCUS_ZOOM = MARKER_MAX_ZOOM;
  const roundCoordinate = (value: number): number => Number(value.toFixed(6));
  const fetchPlaces = async (url: string): Promise<readonly PlaceMapItem[]> => {
    if (!url) throw new Error('Не указан источник данных карты');

    const response = await fetch(url);
    if (!response.ok) throw new Error('Не удалось загрузить данные карты');

    const payload = (await response.json()) as PlaceMapPayload;
    return payload.places;
  };
  const copyGeometryRing = (ring: readonly PlaceGeometryPosition[]): LngLat[] =>
    ring.map(([lng, lat]) => [lng, lat]);
  const toMapGeometry = (
    geometry: PlacePolygonGeometry,
  ): PolygonGeometry | MultiPolygonGeometry => {
    switch (geometry.type) {
      case 'Polygon':
        return {
          type: geometry.type,
          coordinates: geometry.coordinates.map(copyGeometryRing),
        };
      case 'MultiPolygon':
        return {
          type: geometry.type,
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map(copyGeometryRing),
          ),
        };
    }
  };
  const CUSTOM_MARKER_IMAGES: Readonly<
    Record<
      PlaceMarker,
      { readonly src: string; readonly width: number; readonly height: number }
    >
  > = {
    apple: APPLE_MARKER,
    animals: ANIMALS_MARKER,
    foodtruck: FOODTRUCK_MARKER,
    titanic: TITANIC_MARKER,
    construction: CONSTRUCTION_MARKER,
    fish: FISH_MARKER,
    kpp: KPP_MARKER,
  };
  const getPaddedBounds = (
    coordinates: readonly ymaps3.LngLat[],
  ): ymaps3.LngLatBounds => {
    if (coordinates.length < 2) return SETTLEMENT_BOUNDS;

    const longitudes = coordinates.map(([lng]) => lng);
    const latitudes = coordinates.map(([, lat]) => lat);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const lngPadding = (maxLng - minLng) * BOUNDS_PADDING_RATIO;
    const latPadding = (maxLat - minLat) * BOUNDS_PADDING_RATIO;

    return [
      [
        roundCoordinate(minLng - lngPadding),
        roundCoordinate(minLat - latPadding),
      ],
      [
        roundCoordinate(maxLng + lngPadding),
        roundCoordinate(maxLat + latPadding),
      ],
    ];
  };
  const getPlaceBounds = (): ymaps3.LngLatBounds =>
    getPaddedBounds(
      places.map((place): ymaps3.LngLat => [
        place.coordinates.lng,
        place.coordinates.lat,
      ]),
    );
  const getMarkerScale = (zoom: number): number => {
    if (zoom > MARKER_MAX_ZOOM) {
      const closeupProgress = Math.min(
        1,
        (zoom - MARKER_MAX_ZOOM) / (MARKER_CLOSEUP_MAX_ZOOM - MARKER_MAX_ZOOM),
      );

      return 1 + (MARKER_CLOSEUP_MAX_SCALE - 1) * closeupProgress;
    }

    const progress = Math.min(
      1,
      Math.max(
        0,
        (zoom - MARKER_MIN_ZOOM) / (MARKER_MAX_ZOOM - MARKER_MIN_ZOOM),
      ),
    );

    return MARKER_MIN_SCALE + (1 - MARKER_MIN_SCALE) * progress;
  };
  const getMapZoomDuration = (): number =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 0
      : CLUSTER_ZOOM_DURATION_MS;
  const getViewMargin = (): ymaps3.Margin =>
    window.matchMedia?.('(max-width: 40rem)').matches
      ? MOBILE_VIEW_MARGIN
      : VIEW_MARGIN;
  const removeHighlightQuery = (expectedSlug?: string): void => {
    const url = new URL(window.location.href);

    if (!url.searchParams.has(HIGHLIGHT_QUERY_PARAM)) return;

    const currentSlug =
      url.searchParams.get(HIGHLIGHT_QUERY_PARAM) || undefined;

    if (currentSlug !== expectedSlug) return;

    const query = url.search
      .slice(1)
      .split('&')
      .filter((part) => {
        const separator = part.indexOf('=');
        const encodedName = separator === -1 ? part : part.slice(0, separator);

        try {
          return (
            decodeURIComponent(encodedName.replaceAll('+', ' ')) !==
            HIGHLIGHT_QUERY_PARAM
          );
        } catch {
          return true;
        }
      })
      .join('&');

    url.search = query ? `?${query}` : '';
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let map: ymaps3.YMap | undefined;
  let mapClusterer: ymaps3.YMapEntity<unknown> | undefined;
  let mapListener: ymaps3.YMapListener | undefined;
  let mapAreaFeatures = new SvelteMap<string, ymaps3.YMapFeature>();
  let markerContents: Array<readonly [PlaceMapItem, HTMLAnchorElement]> = [];
  const markerHoveredAreas = new SvelteSet<string>();
  const featureHoveredAreas = new SvelteSet<string>();
  const focusedAreas = new SvelteSet<string>();
  const highlightedAreas = new SvelteSet<string>();
  const areaHoverLeaveTimers = new SvelteMap<string, number>();
  let pendingClusterFocusId: Feature['id'] | undefined;
  let clusterFocusFrame: number | undefined;
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);
  let errorPlace = $derived(places[0] ?? fallbackPlace);

  const mapBehaviors = (): ymaps3.BehaviorType[] => [
    'drag',
    'scrollZoom',
    'pinchZoom',
    'dblClick',
    'oneFingerZoom',
  ];

  const supportsAreaHover = (): boolean =>
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

  const getMapToken = (name: string): string => {
    const inheritedValue = mapContainer
      ? getComputedStyle(mapContainer).getPropertyValue(name).trim()
      : '';
    const value =
      inheritedValue ||
      document.documentElement.style.getPropertyValue(name).trim();

    if (!value) throw new Error(`Не найден цвет карты ${name}`);

    return value;
  };

  const createAreaStyle = (
    state: 'hidden' | 'preview' | 'highlighted',
  ): DrawingStyle => {
    if (state === 'hidden') {
      return {
        zIndex: 0,
        fillOpacity: 0,
        interactive: false,
        stroke: [],
      };
    }

    const highlighted = state === 'highlighted';
    const water = getMapToken('--color-water');
    const dash = highlighted ? [6, 3] : [5, 4];

    return {
      zIndex: 0,
      fill: water,
      fillOpacity: 0,
      interactive: supportsAreaHover(),
      simplificationRate: 0,
      stroke: [
        {
          color: water,
          dash,
          opacity: 0.42,
          width: highlighted ? 5 : 4,
        },
        {
          color: water,
          dash,
          opacity: 1,
          width: highlighted ? 2.5 : 2,
        },
      ],
    };
  };

  const updateAreaVisibility = (place: PlaceMapItem): void => {
    const feature = mapAreaFeatures.get(place.slug);

    if (!feature) return;

    const highlighted = highlightedAreas.has(place.slug);
    const previewed =
      markerHoveredAreas.has(place.slug) ||
      featureHoveredAreas.has(place.slug) ||
      focusedAreas.has(place.slug);

    feature.update({
      style: createAreaStyle(
        highlighted ? 'highlighted' : previewed ? 'preview' : 'hidden',
      ),
    });
  };

  const setAreaState = (
    place: PlaceMapItem,
    states: Set<string>,
    active: boolean,
  ): void => {
    if (!place.geometry) return;

    if (active) {
      states.add(place.slug);
    } else {
      states.delete(place.slug);
    }
    updateAreaVisibility(place);
  };

  const cancelAreaHoverLeave = (place: PlaceMapItem): void => {
    const timer = areaHoverLeaveTimers.get(place.slug);

    if (timer === undefined) return;

    window.clearTimeout(timer);
    areaHoverLeaveTimers.delete(place.slug);
  };

  const scheduleAreaHoverLeave = (place: PlaceMapItem): void => {
    cancelAreaHoverLeave(place);
    areaHoverLeaveTimers.set(
      place.slug,
      window.setTimeout(() => {
        areaHoverLeaveTimers.delete(place.slug);
        setAreaState(place, markerHoveredAreas, false);
      }, AREA_HOVER_LEAVE_DELAY_MS),
    );
  };

  const createAreaFeature = (
    place: PlaceMapItem,
    YMapFeature: typeof ymaps3.YMapFeature,
  ): ymaps3.YMapFeature | undefined => {
    const area = place.geometry?.area;

    if (!area) return;

    return new YMapFeature({
      id: `${place.slug}-area`,
      geometry: toMapGeometry(area.geometry),
      style: createAreaStyle('hidden'),
      onMouseEnter: () => {
        if (!supportsAreaHover()) return;

        cancelAreaHoverLeave(place);
        setAreaState(place, featureHoveredAreas, true);
        setAreaState(place, markerHoveredAreas, false);
      },
      onMouseLeave: () => setAreaState(place, featureHoveredAreas, false),
    });
  };

  const updateMarkerContent = (
    place: PlaceMapItem,
    link: HTMLAnchorElement,
  ): void => {
    const closingTime = place.openingHours
      ? getPlaceClosingTime(place.openingHours)
      : undefined;

    if (!place.openingHours) {
      delete link.dataset.open;
    } else {
      link.dataset.open = String(Boolean(closingTime));
    }

    const status =
      place.status === 'existing' ? '' : `, ${formatPlaceStatus(place.status)}`;
    let openingStatus = '';

    if (place.openingHours) {
      openingStatus = closingTime
        ? `открыто до ${closingTime}`
        : 'сейчас закрыто';
    }

    link.setAttribute(
      'aria-label',
      `Открыть место «${place.name}»${status}${openingStatus ? `, ${openingStatus}` : ''}`,
    );
    link.title =
      place.status === 'underConstruction'
        ? place.name
        : `${place.name}${status}${openingStatus ? `\n${openingStatus}` : ''}`;
  };

  const refreshMarkerContents = (): void => {
    for (const [place, link] of markerContents) {
      updateMarkerContent(place, link);
    }
  };

  const createMarkerContent = (place: PlaceMapItem): HTMLAnchorElement => {
    const link = document.createElement('a');
    const visual = document.createElement('span');

    link.className = 'place-map-marker';
    link.href = place.url;
    link.dataset.status = place.status;
    updateMarkerContent(place, link);
    link.addEventListener('click', (event) => event.stopPropagation());
    link.addEventListener('mouseenter', () => {
      if (!supportsAreaHover()) return;

      cancelAreaHoverLeave(place);
      setAreaState(place, markerHoveredAreas, true);
    });
    link.addEventListener('mouseleave', () => scheduleAreaHoverLeave(place));
    link.addEventListener('focus', () =>
      setAreaState(place, focusedAreas, true),
    );
    link.addEventListener('blur', () =>
      setAreaState(place, focusedAreas, false),
    );
    link.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setAreaState(place, focusedAreas, false);
        return;
      }
      if (event.key !== ' ') return;

      event.preventDefault();
      link.click();
    });

    if (place.marker) {
      const markerImage = CUSTOM_MARKER_IMAGES[place.marker];
      const image = document.createElement('img');

      link.dataset.marker = place.marker;
      visual.className = 'place-map-marker-graphic';
      image.className = 'place-map-marker-image';
      image.src = markerImage.src;
      image.alt = '';
      image.width = markerImage.width;
      image.height = markerImage.height;
      image.draggable = false;
      visual.append(image);
    } else {
      const point = document.createElement('span');

      visual.className = 'place-map-marker-point';
      point.className = 'place-map-marker-point-surface ui-map-marker';
      visual.append(point);
    }

    if (place.openingHours) {
      const closedIndicator = document.createElement('span');

      closedIndicator.className = 'place-map-marker-closed-indicator';
      visual.append(closedIndicator);
    }

    visual.setAttribute('aria-hidden', 'true');
    link.append(visual);

    return link;
  };

  const createFeatures = (): Feature[] =>
    places.map((place) => ({
      type: 'Feature',
      id: place.slug,
      geometry: {
        type: 'Point',
        coordinates: [place.coordinates.lng, place.coordinates.lat],
      },
    }));

  const updateMarkerScale = (zoom: number): void => {
    mapContainer?.style.setProperty(
      '--place-map-marker-scale',
      getMarkerScale(zoom).toFixed(3),
    );
  };

  const zoomToCluster = (features: readonly Feature[]): void => {
    map?.update({
      location: {
        bounds: getPaddedBounds(
          features.map((feature) => feature.geometry.coordinates),
        ),
        duration: getMapZoomDuration(),
        easing: 'ease-in-out',
      },
      margin: getViewMargin(),
    });
  };

  const focusPlace = (place: PlaceMapItem, duration: number): void => {
    map?.update({
      location: {
        center: [place.coordinates.lng, place.coordinates.lat],
        zoom: PLACE_FOCUS_ZOOM,
        duration,
        easing: 'ease-in-out',
      },
    });
  };

  const restoreClusterFocus = (): void => {
    const featureId = pendingClusterFocusId;

    if (featureId === undefined) return;

    pendingClusterFocusId = undefined;
    clusterFocusFrame = window.requestAnimationFrame(() => {
      clusterFocusFrame = undefined;
      const id = String(featureId);
      const marker = markerContents.find(([place]) => place.slug === id)?.[1];

      if (marker?.isConnected) {
        marker.focus();
        return;
      }

      const clusters =
        mapContainer?.querySelectorAll<HTMLButtonElement>(
          '.place-map-cluster',
        ) ?? [];
      const cluster = Array.from(clusters).find((candidate) =>
        candidate.dataset.placeIds?.split(' ').includes(id),
      );

      cluster?.focus();
    });
  };

  const createClusterContent = (
    features: readonly Feature[],
  ): HTMLButtonElement => {
    const button = document.createElement('button');
    const label = `${features.length} ${pluralize(features.length, ['место', 'места', 'мест'])} рядом`;

    button.type = 'button';
    button.className = 'place-map-cluster';
    button.dataset.placeIds = features.map(({ id }) => String(id)).join(' ');
    button.textContent = String(features.length);
    button.title = label;
    button.setAttribute('aria-label', `${label}. Приблизить карту`);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      pendingClusterFocusId = event.detail === 0 ? features[0]?.id : undefined;
      zoomToCluster(features);
    });

    return button;
  };

  const fitPlaces = (): void => {
    map?.update?.({
      location: { bounds: getPlaceBounds(), duration: 0 },
      margin: getViewMargin(),
    });
  };

  const clearMap = (): void => {
    for (const timer of areaHoverLeaveTimers.values()) {
      window.clearTimeout(timer);
    }
    areaHoverLeaveTimers.clear();

    if (map) {
      for (const feature of mapAreaFeatures.values()) map.removeChild(feature);
      if (mapClusterer) map.removeChild(mapClusterer);
      if (mapListener) map.removeChild(mapListener);
      map.destroy();
    }

    mapClusterer = undefined;
    mapListener = undefined;
    mapAreaFeatures = new SvelteMap();
    markerContents = [];
    markerHoveredAreas.clear();
    featureHoveredAreas.clear();
    focusedAreas.clear();
    highlightedAreas.clear();
    pendingClusterFocusId = undefined;
    if (clusterFocusFrame !== undefined) {
      window.cancelAnimationFrame(clusterFocusFrame);
    }
    clusterFocusFrame = undefined;
    mapContainer?.style.removeProperty('--place-map-marker-scale');
    map = undefined;
  };

  onMount(() => {
    let destroyed = false;
    let highlightTimer: number | undefined;
    let markerUpdateTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const highlightUrl = new URL(window.location.href);
    const requestedSlug =
      highlightUrl.searchParams.get(HIGHLIGHT_QUERY_PARAM) || undefined;
    let highlightedPlace: PlaceMapItem | undefined;

    const startPlaceHighlight = (place: PlaceMapItem): void => {
      const marker = markerContents.find(
        ([candidate]) => candidate.slug === place.slug,
      )?.[1];

      if (!marker) {
        highlightedPlace = undefined;
        removeHighlightQuery(place.slug);
        return;
      }

      marker.dataset.highlighted = 'true';
      marker.setAttribute('aria-current', 'location');
      setAreaState(place, highlightedAreas, true);
      focusPlace(place, getMapZoomDuration());
      highlightTimer = window.setTimeout(() => {
        highlightTimer = undefined;
        delete marker.dataset.highlighted;
        marker.removeAttribute('aria-current');
        setAreaState(place, highlightedAreas, false);
        highlightedPlace = undefined;
        removeHighlightQuery(place.slug);
      }, HIGHLIGHT_DURATION_MS);
    };

    installYandexMapsRuntimeHeadPersistence();

    const refresh = (): void => {
      void waitForStableLayout().then(() => {
        if (destroyed) return;

        if (highlightedPlace) {
          focusPlace(highlightedPlace, 0);
          return;
        }

        fitPlaces();
      });
    };

    document.addEventListener('astro:page-load', refresh);

    if (typeof ResizeObserver !== 'undefined' && mapContainer) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(mapContainer);
    }

    void (async () => {
      try {
        const placesRequest = places.length
          ? Promise.resolve(places)
          : fetchPlaces(dataUrl);
        const [loadedPlaces] = await Promise.all([
          placesRequest,
          loadYandexMaps(),
        ]);

        if (destroyed || !mapContainer) return;

        places = loadedPlaces;
        highlightedPlace = requestedSlug
          ? places.find((place) => place.slug === requestedSlug)
          : undefined;

        if (
          highlightUrl.searchParams.has(HIGHLIGHT_QUERY_PARAM) &&
          !highlightedPlace
        ) {
          removeHighlightQuery(requestedSlug);
        }

        const ymaps3 = window.ymaps3;

        if (!ymaps3) {
          removeHighlightQuery(highlightedPlace?.slug);
          highlightedPlace = undefined;
          error = 'Yandex Maps API недоступен';
          isLoading = false;
          return;
        }

        await ymaps3.ready;
        const { YMapClusterer, clusterByGrid } =
          await import('@yandex/ymaps3-clusterer');
        await waitForStableLayout();

        if (destroyed || !mapContainer) return;

        const {
          YMap,
          YMapDefaultFeaturesLayer,
          YMapDefaultSchemeLayer,
          YMapFeature,
          YMapListener,
          YMapMarker,
        } = ymaps3;

        map = new YMap(
          mapContainer,
          {
            location: { bounds: getPlaceBounds() },
            behaviors: mapBehaviors(),
            mode: 'vector',
          },
          [
            new YMapDefaultSchemeLayer({
              layers: {
                ground: { zIndex: 0 },
                buildings: { zIndex: 1 },
                icons: { visible: false, zIndex: 2 },
                labels: { zIndex: 3 },
              },
            }),
            new YMapDefaultFeaturesLayer(),
          ],
        );

        markerContents = places.map(
          (place) => [place, createMarkerContent(place)] as const,
        );
        for (const place of places) {
          const feature = createAreaFeature(place, YMapFeature);

          if (!feature) continue;

          mapAreaFeatures.set(place.slug, feature);
          map.addChild(feature);
        }
        mapListener = new YMapListener({
          onUpdate: ({ location, mapInAction }) => {
            updateMarkerScale(location.zoom);
            if (!mapInAction) restoreClusterFocus();
          },
        });
        mapClusterer = new YMapClusterer({
          method: clusterByGrid({ gridSize: CLUSTER_GRID_SIZE }),
          features: createFeatures(),
          maxZoom: PLACE_FOCUS_ZOOM - 1,
          marker: (feature) => {
            const content = markerContents.find(
              ([place]) => place.slug === feature.id,
            )?.[1];

            if (!content)
              throw new Error(`Не найден маркер места ${feature.id}`);

            return new YMapMarker(
              { coordinates: feature.geometry.coordinates },
              content,
            );
          },
          cluster: (coordinates, features) =>
            new YMapMarker({ coordinates }, createClusterContent(features)),
        });
        map.addChild(mapListener);
        map.addChild(mapClusterer);
        updateMarkerScale(map.zoom);

        if (highlightedPlace) {
          startPlaceHighlight(highlightedPlace);
        } else {
          fitPlaces();
        }
        if (markerContents.some(([place]) => place.openingHours)) {
          markerUpdateTimer = window.setInterval(refreshMarkerContents, 60_000);
        }
        isLoading = false;
      } catch (reason) {
        console.error('Places map setup error:', reason);
        clearMap();

        if (!destroyed) {
          removeHighlightQuery(highlightedPlace?.slug);
          highlightedPlace = undefined;
          error = reason instanceof Error ? reason.message : 'Карта недоступна';
          isLoading = false;
        }
      }
    })();

    return () => {
      destroyed = true;
      document.removeEventListener('astro:page-load', refresh);
      resizeObserver?.disconnect();
      if (highlightTimer !== undefined) {
        window.clearTimeout(highlightTimer);
      }
      if (markerUpdateTimer !== undefined) {
        window.clearInterval(markerUpdateTimer);
      }
      clearMap();
    };
  });
</script>

<div
  data-testid="place-map"
  class="relative h-full w-full overflow-hidden bg-[color:var(--color-bg-soft)]"
>
  {#if isLoading}
    <div
      class="map-placeholder pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      aria-live="polite"
    >
      <p
        class="border border-border bg-[color:var(--color-surface)] px-4 py-2 text-sm font-medium text-muted-foreground"
      >
        Загружаем карту…
      </p>
    </div>
  {/if}

  {#if error}
    <div
      class="map-placeholder absolute inset-0 z-10 flex items-center justify-center px-5"
      role="status"
    >
      <div
        class="max-w-sm border border-border bg-[color:var(--color-surface)] p-5 text-center"
      >
        <p class="font-semibold text-foreground">Карта сейчас недоступна</p>
        {#if errorPlace}
          <a
            href={errorPlace.url}
            class="site-text-link mt-2 inline-flex font-semibold"
          >
            Открыть карточку «{errorPlace.name}»
          </a>
        {/if}
      </div>
    </div>
  {/if}

  <div bind:this={mapContainer} class="h-full w-full"></div>
</div>

<style>
  :global(.place-map-marker) {
    position: relative;
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-items: center;
    border-radius: 999px;
    transform: translate(-50%, -50%);
    text-decoration: none;
  }

  :global(.place-map-marker[data-highlighted='true']::before) {
    position: absolute;
    inset: -0.3125rem;
    border: 0.1875rem solid var(--color-accent-text);
    border-radius: 999px;
    box-shadow: 0 0 0 0.1875rem var(--color-surface-raised);
    content: '';
    pointer-events: none;
  }

  :global(.place-map-marker[data-highlighted='true']) {
    z-index: 1;
  }

  :global(.place-map-marker[data-highlighted='true']::after) {
    position: absolute;
    top: -1.125rem;
    left: 50%;
    width: 0;
    height: 0;
    border-top: 0.625rem solid var(--color-accent-text);
    border-right: 0.4375rem solid transparent;
    border-left: 0.4375rem solid transparent;
    content: '';
    filter: drop-shadow(0 0.125rem 0 var(--color-surface-raised));
    pointer-events: none;
    transform: translateX(-50%);
    animation: place-map-highlight-arrow 0.7s ease-in-out infinite alternate;
  }

  :global(.place-map-marker[data-marker]) {
    width: 3rem;
    height: 3rem;
  }

  :global(.place-map-marker-point) {
    --ui-map-marker-size: 0.9375rem;
    --ui-map-marker-border: 0.1875rem solid var(--color-surface-raised);

    position: relative;
    display: block;
    width: var(--ui-map-marker-size);
    height: var(--ui-map-marker-size);
    flex: none;
    scale: var(--place-map-marker-scale, 1);
    transition:
      scale 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker-point-surface) {
    display: block;
    transition: filter 0.15s ease;
  }

  :global(.place-map-marker-graphic) {
    position: relative;
    display: block;
    width: 2rem;
    flex: none;
    scale: var(--place-map-marker-scale, 1);
    transition:
      scale 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker[data-marker='apple'] .place-map-marker-graphic) {
    width: 1.75rem;
  }

  :global(
    .place-map-marker[data-marker='construction'] .place-map-marker-graphic
  ) {
    width: 1.3333rem;
  }

  :global(.place-map-marker-image) {
    --place-map-marker-state-filter: saturate(1);

    display: block;
    width: 100%;
    height: auto;
    filter: var(--place-map-marker-state-filter)
      drop-shadow(0 0 0.1rem oklch(100% 0 0 / 0.96))
      drop-shadow(0 0.25rem 0.35rem oklch(24% 0.04 145 / 0.4));
    transition: filter 0.15s ease;
    user-select: none;
  }

  :global(.place-map-marker:is(:hover, :focus-visible)) {
    outline: none;
  }

  :global(.place-map-marker:is(:hover, :focus-visible) .place-map-marker-point),
  :global(
    .place-map-marker:is(:hover, :focus-visible) .place-map-marker-graphic
  ) {
    transform: scale(1.16);
  }

  :global(.place-map-marker:focus-visible) {
    box-shadow: 0 0 0 0.1875rem var(--color-ring);
  }

  :global(
    .place-map-marker[data-open='false'] .place-map-marker-point-surface
  ) {
    filter: grayscale(1);
  }

  :global(.place-map-marker[data-open='false'] .place-map-marker-image) {
    --place-map-marker-state-filter: grayscale(1);
  }

  :global(.place-map-marker-closed-indicator) {
    position: absolute;
    top: -0.375rem;
    right: -0.375rem;
    z-index: 1;
    display: none;
    box-sizing: border-box;
    width: 0.75rem;
    height: 0.75rem;
    border: 0.09375rem solid currentColor;
    border-radius: 999px;
    background: var(--color-accent);
    box-shadow: 0 0 0 0.0625rem var(--color-surface-raised);
    color: var(--color-foreground);
    pointer-events: none;
  }

  :global(.place-map-marker-closed-indicator::before),
  :global(.place-map-marker-closed-indicator::after) {
    position: absolute;
    left: 50%;
    border-radius: 999px;
    background: currentColor;
    content: '';
    transform-origin: left center;
  }

  :global(.place-map-marker-closed-indicator::before) {
    top: 0.125rem;
    width: 0.09375rem;
    height: 0.25rem;
    transform: translateX(-50%);
  }

  :global(.place-map-marker-closed-indicator::after) {
    top: calc(50% - 0.046875rem);
    width: 0.21875rem;
    height: 0.09375rem;
    transform: rotate(30deg);
  }

  :global(
    .place-map-marker[data-open='false'] .place-map-marker-closed-indicator
  ) {
    display: block;
  }

  :global(.place-map-marker[data-status='planned'] .place-map-marker-point) {
    border-style: dashed;
    opacity: 0.76;
  }

  :global(.place-map-marker[data-status='planned'] .place-map-marker-graphic) {
    opacity: 0.76;
  }

  :global(
    .place-map-marker[data-status='underConstruction'] .place-map-marker-point
  ) {
    border-radius: 0.25rem;
  }

  :global(.place-map-cluster) {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 0.125rem solid var(--color-primary);
    border-radius: 999px;
    background: var(--color-surface-raised);
    box-shadow:
      0 0 0 0.125rem color-mix(in oklab, var(--color-surface) 88%, transparent),
      0 0.2rem 0.45rem oklch(24% 0.04 145 / 0.28);
    color: var(--color-foreground);
    cursor: pointer;
    font: inherit;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1;
    touch-action: manipulation;
    transform: translate(-50%, -50%);
    animation: place-map-cluster-enter 0.16s ease-out;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-cluster:hover) {
    border-color: var(--color-primary-hover);
    background: var(--color-primary-soft);
    transform: translate(-50%, -50%) scale(1.08);
  }

  :global(.place-map-cluster:focus-visible) {
    outline: 0.1875rem solid var(--color-ring);
    outline-offset: 0.125rem;
    transform: translate(-50%, -50%) scale(1.08);
  }

  :global(.place-map-cluster:active) {
    transform: translate(-50%, -50%) scale(0.96);
  }

  @keyframes place-map-cluster-enter {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.72);
    }
  }

  @keyframes place-map-highlight-arrow {
    to {
      transform: translate(-50%, 0.25rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.place-map-marker-point),
    :global(.place-map-marker-point-surface),
    :global(.place-map-marker-graphic),
    :global(.place-map-marker-image),
    :global(.place-map-marker[data-highlighted='true']::after),
    :global(.place-map-cluster) {
      animation: none;
      transition: none;
    }
  }

  .map-placeholder {
    background:
      linear-gradient(
        color-mix(in oklab, var(--color-border) 62%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in oklab, var(--color-border) 62%, transparent) 1px,
        transparent 1px
      ),
      var(--color-bg-soft);
    background-size: 2rem 2rem;
  }
</style>
