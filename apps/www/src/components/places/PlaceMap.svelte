<script lang="ts">
  import { FOODTRUCK_MARKER } from '@shelkovo/ui/markers';
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
  const VIEW_MARGIN: ymaps3.Margin = [64, 32, 48, 32];
  const CUSTOM_MARKER_IMAGES: Readonly<
    Record<
      PlaceMarker,
      { readonly src: string; readonly width: number; readonly height: number }
    >
  > = {
    foodtruck: FOODTRUCK_MARKER,
  };

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let map: ymaps3.YMap | undefined;
  let markers: ymaps3.YMapMarker[] = [];
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);

  const mapBehaviors = (): ymaps3.BehaviorType[] =>
    window.matchMedia?.('(any-pointer: coarse)').matches
      ? ['pinchZoom', 'dblClick']
      : ['drag', 'scrollZoom', 'dblClick'];

  const createMarkerContent = (place: Place): HTMLAnchorElement => {
    const link = document.createElement('a');
    const visual = document.createElement('span');

    link.className = 'place-map-marker';
    link.href = place.url;
    link.dataset.status = place.status;
    const isOpen = place.openingHours
      ? isPlaceOpen(place.openingHours)
      : undefined;

    if (isOpen !== undefined) {
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

  const fitSettlement = (): void => {
    map?.update?.({
      location: { bounds: SETTLEMENT_BOUNDS, duration: 0 },
      margin: VIEW_MARGIN,
    });
  };

  const clearMap = (): void => {
    if (!map) return;

    for (const marker of markers) {
      map.removeChild(marker);
    }

    markers = [];
    map.destroy();
    map = undefined;
  };

  onMount(() => {
    let destroyed = false;
    let resizeObserver: ResizeObserver | undefined;

    installYandexMapsRuntimeHeadPersistence();

    const refresh = (): void => fitSettlement();

    document.addEventListener('astro:page-load', refresh);

    if (typeof ResizeObserver !== 'undefined' && mapContainer) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(mapContainer);
    }

    void (async () => {
      try {
        await loadYandexMaps();

        if (destroyed || !mapContainer || !window.ymaps3) return;

        await window.ymaps3.ready;
        await waitForStableLayout();

        if (destroyed || !mapContainer || !window.ymaps3) return;

        const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer } =
          window.ymaps3;

        map = new YMap(
          mapContainer,
          {
            location: { bounds: SETTLEMENT_BOUNDS },
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
          const marker = new window.ymaps3!.YMapMarker(
            {
              coordinates: [place.coordinates.lng, place.coordinates.lat],
            },
            createMarkerContent(place),
          );

          map?.addChild(marker);
          return marker;
        });

        fitSettlement();
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

  :global(.place-map-marker-point) {
    --ui-map-marker-size: 1.4rem;
    --ui-map-marker-border: 0.1875rem solid var(--color-surface-raised);

    flex: none;
    transition:
      filter 0.15s ease,
      transform 0.15s ease;
  }

  :global(.place-map-marker-graphic) {
    display: block;
    width: 2.5rem;
    flex: none;
    filter: drop-shadow(0 0.25rem 0.3rem oklch(24% 0.04 145 / 0.16));
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

  :global(.place-map-marker[data-open='false'] .place-map-marker-point),
  :global(.place-map-marker[data-open='false'] .place-map-marker-graphic) {
    filter: grayscale(1);
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
