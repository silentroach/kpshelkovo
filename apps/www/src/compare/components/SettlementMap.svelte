<script lang="ts">
  import { formatTariff } from '@shelkovo/format';
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    installYandexMapsRuntimeHeadPersistence,
    loadYandexMaps,
    waitForStableLayout,
  } from '@/lib/yandex-maps/runtime';
  import { withBase } from '../lib/url';

  interface SettlementMapData {
    slug: string;
    name: string;
    shortName: string;
    lat: number;
    lng: number;
    normalizedTariff: number;
    isBaseline: boolean;
    tariffText?: string;
    tariffHint?: string;
    companyText?: string;
  }

  interface Props {
    settlements: SettlementMapData[];
    interactive?: boolean;
    popup?: boolean;
    shell?: boolean;
    muted?: boolean;
    height?: number;
    focusX?: number;
  }

  interface MarkerLike {
    slug: string;
    marker: ymaps3.YMapMarker;
    el: HTMLElement;
  }

  interface Range {
    min: number;
    max: number;
  }

  let {
    settlements,
    interactive = true,
    popup = true,
    shell = true,
    muted = false,
    height = 375,
    focusX = 0.5,
  }: Props = $props();

  let mapContainer: HTMLDivElement | undefined = $state(undefined);
  let popupEl: HTMLDivElement | undefined = $state(undefined);
  let popupLink: HTMLAnchorElement | undefined = $state(undefined);
  let map: ymaps3.YMap | undefined = $state(undefined);
  let marks: MarkerLike[] = $state([]);
  let activeMarker: HTMLElement | undefined;
  let isLoading = $state(true);
  let error: string | undefined = $state(undefined);
  let ymapsLoaded = $state(false);
  interface Tip {
    item: SettlementMapData;
    x: number;
    y: number;
    up: boolean;
  }

  let tip: Tip | undefined = $state(undefined);

  const PAD = 32;

  function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  function shift(lng: number, zoom: number): number {
    if (!mapContainer) return lng;

    const fx = clamp(focusX, 0.05, 0.95);
    if (Math.abs(fx - 0.5) < 0.01) return lng;

    const w = Math.max(1, mapContainer.clientWidth);
    const deg = 360 / (256 * 2 ** zoom);
    return lng - (fx - 0.5) * w * deg;
  }

  function getRange(list: SettlementMapData[]): Range | undefined {
    const vals = list
      .filter((item) => !item.isBaseline)
      .map((item) => item.normalizedTariff);
    if (vals.length === 0) return;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

  function getTariffColor(
    tariff: number,
    isBaseline: boolean,
    range: Range | undefined,
  ): string {
    if (isBaseline) {
      return '#064b08';
    }

    if (!range || range.min === range.max) {
      return '#6a502e';
    }

    const normalized = Math.max(
      0,
      Math.min(1, (tariff - range.min) / (range.max - range.min)),
    );
    const red = Math.round(180 + 50 * normalized);
    const green = Math.round(130 + 70 * (1 - normalized));
    const blue = Math.round(86 + 30 * (1 - normalized));
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function getMapView(): {
    location: ymaps3.YMapLocationRequest;
    margin: [number, number, number, number];
  } {
    if (settlements.length === 0) {
      return {
        location: { center: [37.6173, 55.7558], zoom: 9 },
        margin: [0, 0, 0, 0],
      };
    }

    if (settlements.length === 1) {
      const item = settlements[0];
      const zoom = 12;
      return {
        location: { center: [shift(item.lng, zoom), item.lat], zoom },
        margin: [0, 0, 0, 0],
      };
    }

    const lat = settlements.map((s) => s.lat);
    const lng = settlements.map((s) => s.lng);
    const minLat = Math.min(...lat);
    const maxLat = Math.max(...lat);
    const minLng = Math.min(...lng);
    const maxLng = Math.max(...lng);
    return {
      location: {
        bounds: [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
      },
      margin: [PAD, PAD, PAD, PAD],
    };
  }

  function clearMarkers(): void {
    if (!map) return;

    closePopup();
    for (const item of marks) {
      map.removeChild?.(item.marker);
    }
    marks = [];
  }

  function syncMarkers(ym: typeof ymaps3): void {
    if (!map) return;

    const { YMapMarker } = ym;
    const range = getRange(settlements);
    const canOpenPopup = interactive && popup;
    const currentSlugs = new Set(settlements.map((s) => s.slug));

    for (const item of [...marks]) {
      if (!currentSlugs.has(item.slug)) {
        if (item.el === activeMarker) closePopup();
        map.removeChild?.(item.marker);
        marks = marks.filter((m) => m !== item);
      }
    }

    const bySlug = new Map(marks.map((m) => [m.slug, m]));

    for (const settlement of settlements) {
      const color = getTariffColor(
        settlement.normalizedTariff,
        settlement.isBaseline,
        range,
      );

      const existing = bySlug.get(settlement.slug);
      if (existing) {
        existing.el.style.background = color;
        existing.el.style.cursor = canOpenPopup ? 'pointer' : 'default';
        existing.marker.update?.({
          coordinates: [settlement.lng, settlement.lat],
        });
        continue;
      }

      const el = document.createElement(canOpenPopup ? 'button' : 'div');
      el.className = 'settlement-map-marker ui-map-marker';
      el.style.cssText = `
        background: ${color};
        cursor: ${canOpenPopup ? 'pointer' : 'default'};
      `;
      el.setAttribute('title', settlement.name);
      if (canOpenPopup) {
        el.setAttribute('type', 'button');
        el.setAttribute(
          'aria-label',
          `Показать данные о поселке «${settlement.name}»`,
        );
        el.setAttribute('aria-expanded', 'false');
        el.addEventListener('click', (evt) => {
          evt.stopPropagation();
          const current = settlements.find((s) => s.slug === settlement.slug);
          void open(current ?? settlement, el, evt.detail === 0);
        });
      } else {
        el.setAttribute('aria-hidden', 'true');
      }

      const marker = new YMapMarker(
        { coordinates: [settlement.lng, settlement.lat] },
        el,
      );

      map.addChild(marker);
      marks.push({ slug: settlement.slug, marker, el });
    }
  }

  async function initMap(): Promise<void> {
    if (!mapContainer || !ymapsLoaded) return;

    try {
      await waitForStableLayout();

      if (!mapContainer) return;

      const ymaps3 = window.ymaps3;

      if (!ymaps3) {
        error = 'Yandex Maps API не доступен';
        isLoading = false;
        return;
      }

      await ymaps3.ready;

      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;

      const view = getMapView();

      map = new YMap(
        mapContainer,
        {
          location: view.location,
        },
        [new YMapDefaultSchemeLayer(), new YMapDefaultFeaturesLayer()],
      );

      syncMarkers(ymaps3);

      isLoading = false;

      // Применяем отступ через update(): если передать его только в конструктор,
      // виды по границам карты получают другой, слишком широкий zoom.
      if (view.location.bounds) {
        map.update?.({
          location: { ...view.location, duration: 0 },
          margin: view.margin,
        });
      }
    } catch (err) {
      console.error('Map initialization error:', err);
      error = 'Ошибка при загрузке карты';
      isLoading = false;
    }
  }

  async function syncMap(): Promise<void> {
    if (!mapContainer) return;

    const ymaps3 = window.ymaps3;
    if (!ymaps3) {
      error = 'Yandex Maps API не доступен';
      isLoading = false;
      return;
    }

    if (!map) {
      await initMap();
      return;
    }

    closePopup();
    syncMarkers(ymaps3);
    const view = getMapView();
    if (!map.update) {
      map.destroy();
      map = undefined;
      await initMap();
      return;
    }
    map.update?.({
      location: {
        ...view.location,
        duration: 250,
      },
      margin: view.margin,
    });
  }

  function closePopup(restoreFocus = false): void {
    const marker = activeMarker;
    marker?.setAttribute('aria-expanded', 'false');
    activeMarker = undefined;
    tip = undefined;

    if (restoreFocus && marker?.isConnected) marker.focus();
  }

  async function open(
    item: SettlementMapData,
    el: HTMLElement,
    moveFocus: boolean,
  ): Promise<void> {
    activeMarker?.setAttribute('aria-expanded', 'false');
    activeMarker = el;
    el.setAttribute('aria-expanded', 'true');

    if (!mapContainer) {
      tip = { item, x: 24, y: 24, up: false };
    } else {
      const mapBox = mapContainer.getBoundingClientRect();
      const dotBox = el.getBoundingClientRect();
      const w = 256;
      const p = 12;
      const cx = dotBox.left - mapBox.left + dotBox.width / 2;
      const cy = dotBox.top - mapBox.top + dotBox.height / 2;
      const x = Math.max(p + w / 2, Math.min(mapBox.width - p - w / 2, cx));
      const up = cy > 120;
      const y = up ? cy - 16 : cy + 16;

      tip = { item, x, y, up };
    }

    if (!moveFocus) return;

    await tick();
    if (activeMarker === el) popupLink?.focus();
  }

  onMount(() => {
    let dead = false;
    let resizeObserver: ResizeObserver | undefined;

    installYandexMapsRuntimeHeadPersistence();

    const onDown = (evt: PointerEvent): void => {
      if (!tip) return;

      const node = evt.target;
      if (!(node instanceof Node)) return;
      if (popupEl?.contains(node)) return;

      closePopup();
    };

    const refresh = (): void => {
      if (!ymapsLoaded || error) return;
      void syncMap();
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('astro:page-load', refresh);

    if (typeof ResizeObserver !== 'undefined' && mapContainer) {
      resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(mapContainer);
    }

    void (async () => {
      try {
        await loadYandexMaps();
        if (!dead) ymapsLoaded = true;
      } catch (err) {
        if (!dead) {
          console.error('Map setup error:', err);
          error = err instanceof Error ? err.message : 'Карта недоступна';
          isLoading = false;
        }
      }
    })();

    return () => {
      dead = true;
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('astro:page-load', refresh);
      resizeObserver?.disconnect();
    };
  });

  onDestroy(() => {
    clearMarkers();
    if (map) {
      map.destroy();
      map = undefined;
    }
  });

  $effect(() => {
    const sig = settlements
      .map((s) => `${s.slug}:${s.lat}:${s.lng}:${s.normalizedTariff}`)
      .join('|');
    sig;
    if (!ymapsLoaded || !mapContainer || error) return;
    let dead = false;
    queueMicrotask(() => {
      if (!dead) {
        void syncMap();
      }
    });

    return () => {
      dead = true;
    };
  });
</script>

<div
  data-testid="settlement-map"
  class={`relative w-full overflow-hidden ${shell ? 'border border-border bg-[color:var(--color-surface)]' : ''}`}
  style={`height: ${height}px; min-height: ${height}px;`}
>
  {#if isLoading}
    <div
      class="map-placeholder absolute inset-0 flex items-center justify-center"
    >
      <div class="text-center">
        <div
          class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"
        ></div>
        <p class="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    </div>
  {/if}

  {#if error}
    <div
      class="map-placeholder absolute inset-0 flex items-center justify-center"
    >
      <div class="text-center max-w-md px-4">
        <div class="text-4xl mb-3">🗺️</div>
        <p class="mb-2 font-medium text-foreground">{error}</p>
        <p class="text-sm text-muted-foreground">
          Попробуйте обновить страницу
        </p>
      </div>
    </div>
  {/if}

  {#if tip && popup}
    <div
      class="pointer-events-none absolute z-10"
      style={`left: ${tip.x}px; top: ${tip.y}px; transform: translate(-50%, ${tip.up ? '-100%' : '0%'});`}
      data-testid="map-popup"
    >
      <div class="relative">
        <div
          bind:this={popupEl}
          class="pointer-events-auto w-64 border border-border bg-[color:var(--color-surface)] p-3"
          data-testid="map-popup-panel"
        >
          <div class="mb-0 flex items-start justify-between gap-3">
            <a
              bind:this={popupLink}
              class="text-base font-semibold text-foreground hover:text-primary"
              href={withBase(`settlements/${tip.item.slug}/`)}
              target="_parent"
              data-testid="map-popup-link"
            >
              {tip.item.shortName}
            </a>
            <button
              type="button"
              class="p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Закрыть попап"
              onclick={() => {
                closePopup(true);
              }}
            >
              <svg
                viewBox="0 0 20 20"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M5 5l10 10M15 5L5 15"></path>
              </svg>
            </button>
          </div>
          {#if tip.item.companyText}
            <p class="mb-2 text-xs leading-tight text-muted-foreground">
              {tip.item.companyText}
            </p>
          {/if}
          <p
            class="mb-0 text-sm text-muted-foreground"
            title={tip.item.tariffHint}
          >
            <strong
              >{tip.item.tariffText ??
                formatTariff(tip.item.normalizedTariff)}</strong
            >
          </p>
        </div>
        <div
          class={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-border bg-[color:var(--color-surface)] ${tip.up ? '-bottom-1.5 border-t-0 border-l-0' : '-top-1.5 border-b-0 border-r-0'}`}
          data-testid="map-popup-arrow"
          aria-hidden="true"
        ></div>
      </div>
    </div>
  {/if}

  <div
    bind:this={mapContainer}
    class={`h-full w-full ${interactive ? '' : 'pointer-events-none'} ${muted ? 'map-muted' : ''}`}
  ></div>

  {#if !interactive}
    <div class="absolute inset-0 z-[5]" aria-hidden="true"></div>
  {/if}
</div>

<style>
  :global(.ymaps-2-1-79-map) {
    width: 100% !important;
    height: 100% !important;
  }

  :global(.settlement-map-marker:focus-visible) {
    outline: 0.1875rem solid var(--color-ring);
    outline-offset: 0.125rem;
  }

  .map-muted {
    opacity: 0.56;
    filter: saturate(0.62) contrast(0.9) brightness(1.02);
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
    background-size: 32px 32px;
  }
</style>
