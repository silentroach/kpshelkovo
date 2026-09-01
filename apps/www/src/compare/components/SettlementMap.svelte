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
  class="settlement-map"
  class:settlement-map--shell={shell}
  style={`height: ${height}px; min-height: ${height}px;`}
>
  {#if isLoading}
    <div class="map-placeholder">
      <div class="map-message">
        <div class="map-spinner"></div>
        <p class="map-loading-text">Загрузка карты...</p>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="map-placeholder">
      <div class="map-message map-error">
        <div class="map-error-icon">🗺️</div>
        <p class="map-error-title">{error}</p>
        <p class="map-error-hint">Попробуйте обновить страницу</p>
      </div>
    </div>
  {/if}

  {#if tip && popup}
    <div
      class="map-popup"
      style={`left: ${tip.x}px; top: ${tip.y}px; transform: translate(-50%, ${tip.up ? '-100%' : '0%'});`}
      data-testid="map-popup"
    >
      <div class="map-popup-anchor">
        <div
          bind:this={popupEl}
          class="map-popup-panel"
          data-testid="map-popup-panel"
        >
          <div class="map-popup-header">
            <a
              bind:this={popupLink}
              class="map-popup-link"
              href={withBase(`settlements/${tip.item.slug}/`)}
              target="_parent"
              data-testid="map-popup-link"
            >
              {tip.item.shortName}
            </a>
            <button
              type="button"
              class="map-popup-close"
              aria-label="Закрыть попап"
              onclick={() => {
                closePopup(true);
              }}
            >
              <svg
                viewBox="0 0 20 20"
                class="map-popup-close-icon"
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
            <p class="map-popup-company">
              {tip.item.companyText}
            </p>
          {/if}
          <p class="map-popup-tariff" title={tip.item.tariffHint}>
            <strong
              >{tip.item.tariffText ??
                formatTariff(tip.item.normalizedTariff)}</strong
            >
          </p>
        </div>
        <div
          class="map-popup-arrow"
          class:map-popup-arrow--up={tip.up}
          class:map-popup-arrow--down={!tip.up}
          data-testid="map-popup-arrow"
          aria-hidden="true"
        ></div>
      </div>
    </div>
  {/if}

  <div
    bind:this={mapContainer}
    class="map-canvas"
    class:map-canvas--static={!interactive}
    class:map-muted={muted}
  ></div>

  {#if !interactive}
    <div class="map-static-overlay" aria-hidden="true"></div>
  {/if}
</div>

<style>
  .settlement-map {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .settlement-map--shell {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  :global(.ymaps-2-1-79-map) {
    width: 100% !important;
    height: 100% !important;
  }

  :global(.settlement-map-marker:focus-visible) {
    outline: 0.1875rem solid var(--color-focus);
    outline-offset: 0.125rem;
  }

  .map-canvas {
    width: 100%;
    height: 100%;
  }

  .map-canvas--static,
  .map-popup {
    pointer-events: none;
  }

  .map-muted {
    opacity: 0.56;
    filter: saturate(0.62) contrast(0.9) brightness(1.02);
  }

  .map-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
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

  .map-message {
    text-align: center;
  }

  .map-spinner {
    width: 2rem;
    height: 2rem;
    margin: 0 auto 0.75rem;
    border-bottom: 0.125rem solid var(--color-text);
    border-radius: 999px;
    animation: map-spin 1s linear infinite;
  }

  .map-loading-text,
  .map-error-hint,
  .map-popup-tariff {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .map-error {
    max-width: 28rem;
    padding-inline: 1rem;
  }

  .map-error-icon {
    margin-bottom: 0.75rem;
    font-size: 2.25rem;
    line-height: 2.5rem;
  }

  .map-error-title {
    margin-bottom: 0.5rem;
    color: var(--color-text);
    font-weight: 600;
  }

  .map-popup {
    position: absolute;
    z-index: 10;
  }

  .map-popup-anchor {
    position: relative;
  }

  .map-popup-panel {
    width: 16rem;
    border: 1px solid var(--color-border);
    padding: 0.75rem;
    background: var(--color-surface);
    pointer-events: auto;
  }

  .map-popup-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .map-popup-link {
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5rem;
  }

  .map-popup-link:hover {
    color: var(--color-primary);
  }

  .map-popup-close {
    padding: 0.25rem;
    color: var(--color-text-muted);
  }

  .map-popup-close:hover {
    background: var(--color-surface-muted);
    color: var(--color-text);
  }

  .map-popup-close-icon {
    width: 1rem;
    height: 1rem;
  }

  .map-popup-company {
    margin-bottom: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 0.9375rem;
  }

  .map-popup-tariff {
    margin-bottom: 0;
  }

  .map-popup-arrow {
    position: absolute;
    left: 50%;
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    transform: translateX(-50%) rotate(45deg);
  }

  .map-popup-arrow--up {
    bottom: -0.375rem;
    border-top: 0;
    border-left: 0;
  }

  .map-popup-arrow--down {
    top: -0.375rem;
    border-right: 0;
    border-bottom: 0;
  }

  .map-static-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
  }

  @keyframes map-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
