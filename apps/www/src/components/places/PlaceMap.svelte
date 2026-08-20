<script lang="ts">
  import { pluralize } from '@shelkovo/format';
  import type { Feature } from '@yandex/ymaps3-clusterer';
  import {
    APPLE_MARKER,
    CONSTRUCTION_MARKER,
    FISH_MARKER,
    FOODTRUCK_MARKER,
    KPP_MARKER,
    TITANIC_MARKER,
  } from '@shelkovo/ui/markers';
  import { onMount } from 'svelte';

  import {
    installYandexMapsRuntimeHeadPersistence,
    loadYandexMaps,
    waitForStableLayout,
  } from '@/lib/yandex-maps/runtime';
  import { getPlaceClosingTime } from '@/lib/places/opening-hours';
  import { PLACE_MAP_BOUNDS } from '@/lib/places/schema';
  import type { PlaceMarker } from '@/lib/places/schema';
  import type { Place } from '@/lib/places/types';
  import { formatPlaceStatus } from '@/lib/places/view';

  let { places }: { readonly places: readonly Place[] } = $props();

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
  const MARKER_MIN_SCALE = 20 / 32;
  const MARKER_MIN_ZOOM = 13.5;
  const MARKER_MAX_ZOOM = 16;
  const PLACE_FOCUS_ZOOM = MARKER_MAX_ZOOM;
  const roundCoordinate = (value: number): number => Number(value.toFixed(6));
  const CUSTOM_MARKER_IMAGES: Readonly<
    Record<
      PlaceMarker,
      { readonly src: string; readonly width: number; readonly height: number }
    >
  > = {
    apple: APPLE_MARKER,
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
  let markerContents: Array<readonly [Place, HTMLAnchorElement]> = [];
  let pendingClusterFocusId: Feature['id'] | undefined;
  let clusterFocusFrame: number | undefined;
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);

  const mapBehaviors = (): ymaps3.BehaviorType[] => [
    'drag',
    'scrollZoom',
    'pinchZoom',
    'dblClick',
    'oneFingerZoom',
  ];

  const updateMarkerContent = (place: Place, link: HTMLAnchorElement): void => {
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

  const createMarkerContent = (place: Place): HTMLAnchorElement => {
    const link = document.createElement('a');
    const visual = document.createElement('span');

    link.className = 'place-map-marker';
    link.href = place.url;
    link.dataset.status = place.status;
    updateMarkerContent(place, link);
    link.addEventListener('click', (event) => event.stopPropagation());
    link.addEventListener('keydown', (event) => {
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
      visual.className = 'place-map-marker-point ui-map-marker';
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

  const focusPlace = (place: Place, duration: number): void => {
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
    if (map) {
      if (mapClusterer) map.removeChild(mapClusterer);
      if (mapListener) map.removeChild(mapListener);
      map.destroy();
    }

    mapClusterer = undefined;
    mapListener = undefined;
    markerContents = [];
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
    let highlightedPlace = requestedSlug
      ? places.find((place) => place.slug === requestedSlug)
      : undefined;

    if (
      highlightUrl.searchParams.has(HIGHLIGHT_QUERY_PARAM) &&
      !highlightedPlace
    ) {
      removeHighlightQuery(requestedSlug);
    }

    const startPlaceHighlight = (place: Place): void => {
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
      focusPlace(place, getMapZoomDuration());
      highlightTimer = window.setTimeout(() => {
        highlightTimer = undefined;
        delete marker.dataset.highlighted;
        marker.removeAttribute('aria-current');
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
        await loadYandexMaps();

        if (destroyed || !mapContainer) return;

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
        {#if places[0]}
          <a
            href={places[0].url}
            class="site-text-link mt-2 inline-flex font-semibold"
          >
            Открыть карточку «{places[0].name}»
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

    flex: none;
    scale: var(--place-map-marker-scale, 1);
    transition:
      filter 0.15s ease,
      scale 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker-graphic) {
    --place-map-marker-state-filter: saturate(1);

    display: block;
    width: 2rem;
    flex: none;
    filter: var(--place-map-marker-state-filter)
      drop-shadow(0 0 0.1rem oklch(100% 0 0 / 0.96))
      drop-shadow(0 0.25rem 0.35rem oklch(24% 0.04 145 / 0.4));
    scale: var(--place-map-marker-scale, 1);
    transition:
      filter 0.15s ease,
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
    display: block;
    width: 100%;
    height: auto;
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

  :global(.place-map-marker[data-open='false'] .place-map-marker-point) {
    filter: grayscale(1);
  }

  :global(.place-map-marker[data-open='false'] .place-map-marker-graphic) {
    --place-map-marker-state-filter: grayscale(1);
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
    :global(.place-map-marker-graphic),
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
