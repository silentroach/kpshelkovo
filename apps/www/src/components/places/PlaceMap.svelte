<script lang="ts">
  import {
    CONSTRUCTION_MARKER,
    FOODTRUCK_MARKER,
    TITANIC_MARKER,
  } from '@shelkovo/ui/markers';
  import { onMount } from 'svelte';

  import {
    installYandexMapsRuntimeHeadPersistence,
    loadYandexMaps,
    waitForStableLayout,
  } from '@/lib/yandex-maps/runtime';
  import { isPlaceOpen } from '@/lib/places/opening-hours';
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
  const BOUNDS_PADDING_RATIO = 0.3;
  const roundCoordinate = (value: number): number => Number(value.toFixed(6));
  const CUSTOM_MARKER_IMAGES: Readonly<
    Record<
      PlaceMarker,
      { readonly src: string; readonly width: number; readonly height: number }
    >
  > = {
    foodtruck: FOODTRUCK_MARKER,
    titanic: TITANIC_MARKER,
    construction: CONSTRUCTION_MARKER,
  };
  const getPlaceBounds = (): ymaps3.LngLatBounds => {
    if (places.length < 2) return SETTLEMENT_BOUNDS;

    const longitudes = places.map((place) => place.coordinates.lng);
    const latitudes = places.map((place) => place.coordinates.lat);
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

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let map: ymaps3.YMap | undefined;
  let markers: ymaps3.YMapMarker[] = [];
  let markerContents: Array<readonly [Place, HTMLAnchorElement]> = [];
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);

  const mapBehaviors = (): ymaps3.BehaviorType[] =>
    window.matchMedia?.('(any-pointer: coarse)').matches
      ? ['pinchZoom', 'dblClick']
      : ['drag', 'scrollZoom', 'dblClick'];

  const updateMarkerContent = (place: Place, link: HTMLAnchorElement): void => {
    const isOpen = place.openingHours
      ? isPlaceOpen(place.openingHours)
      : undefined;

    if (isOpen === undefined) {
      delete link.dataset.open;
    } else {
      link.dataset.open = String(isOpen);
    }

    const status =
      place.status === 'existing' ? '' : `, ${formatPlaceStatus(place.status)}`;
    let openingStatus = '';

    if (isOpen !== undefined) {
      openingStatus = isOpen ? ', открыто сейчас' : ', сейчас закрыто';
    }

    link.setAttribute(
      'aria-label',
      `Открыть место «${place.name}»${status}${openingStatus}`,
    );
    link.title = `${place.name}${status}${openingStatus}`;
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

  const fitPlaces = (): void => {
    map?.update?.({
      location: { bounds: getPlaceBounds(), duration: 0 },
      margin: VIEW_MARGIN,
    });
  };

  const clearMap = (): void => {
    if (map) {
      for (const marker of markers) {
        map.removeChild(marker);
      }

      map.destroy();
    }

    markers = [];
    markerContents = [];
    map = undefined;
  };

  onMount(() => {
    let destroyed = false;
    let markerUpdateTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;

    installYandexMapsRuntimeHeadPersistence();

    const refresh = (): void => {
      void waitForStableLayout().then(() => {
        if (!destroyed) fitPlaces();
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
          error = 'Yandex Maps API недоступен';
          isLoading = false;
          return;
        }

        await ymaps3.ready;
        await waitForStableLayout();

        if (destroyed || !mapContainer) return;

        const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer } =
          ymaps3;

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

        markers = places.map((place) => {
          const content = createMarkerContent(place);
          const marker = new ymaps3.YMapMarker(
            {
              coordinates: [place.coordinates.lng, place.coordinates.lat],
            },
            content,
          );

          markerContents.push([place, content]);
          map?.addChild(marker);
          return marker;
        });

        fitPlaces();
        if (markerContents.some(([place]) => place.openingHours)) {
          markerUpdateTimer = window.setInterval(refreshMarkerContents, 60_000);
        }
        isLoading = false;
      } catch (reason) {
        console.error('Places map setup error:', reason);
        clearMap();

        if (!destroyed) {
          error = reason instanceof Error ? reason.message : 'Карта недоступна';
          isLoading = false;
        }
      }
    })();

    return () => {
      destroyed = true;
      document.removeEventListener('astro:page-load', refresh);
      resizeObserver?.disconnect();
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
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-items: center;
    border-radius: 999px;
    transform: translate(-50%, -50%);
    text-decoration: none;
  }

  :global(.place-map-marker[data-marker]) {
    width: 3rem;
    height: 3rem;
  }

  :global(.place-map-marker-point) {
    --ui-map-marker-size: 1.4rem;
    --ui-map-marker-border: 0.1875rem solid var(--color-surface-raised);

    flex: none;
    transition:
      filter 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker-graphic) {
    --place-map-marker-state-filter: saturate(1);

    display: block;
    width: 3rem;
    flex: none;
    filter: var(--place-map-marker-state-filter)
      drop-shadow(0 0 0.1rem oklch(100% 0 0 / 0.96))
      drop-shadow(0 0.25rem 0.35rem oklch(24% 0.04 145 / 0.4));
    transition:
      filter 0.15s ease,
      transform 0.15s ease;
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
