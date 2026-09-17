import type { LngLat, YMap, YMapLocationRequest } from '@yandex/ymaps3-types';

import { isPlaceOpen } from '@/lib/places/opening-hours';
import { installYandexMapsRuntimeHeadPersistence, loadYandexMaps } from '@/lib/yandex-maps/runtime';

import { getPaddedBounds, toMapGeometry } from './place-map-geometry';
import type { PlacePreviewData } from './place-preview.types';

export const getPreviewLocation = (data: PlacePreviewData): YMapLocationRequest => {
  const point: LngLat = [data.coordinates.lng, data.coordinates.lat];
  const geometry = data.geometry?.area.geometry;
  if (!geometry) return { center: point, zoom: 16.5, duration: 0 };

  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  return {
    bounds: getPaddedBounds([point, ...rings.flat().map(([lng, lat]): LngLat => [lng, lat])]),
    duration: 0
  };
};

export class PlacePreviewElement extends HTMLElement {
  private generation = 0;
  private map?: YMap;
  private actionObserver?: MutationObserver;
  private markerUpdateTimer?: number;

  connectedCallback(): void {
    installYandexMapsRuntimeHeadPersistence();
    void this.initialize(++this.generation);
  }

  private clearMap(): void {
    const map = this.map;
    this.map = undefined;
    this.actionObserver?.disconnect();
    this.actionObserver = undefined;
    window.clearInterval(this.markerUpdateTimer);
    this.markerUpdateTimer = undefined;
    const fallback = this.querySelector<HTMLElement>('[data-fallback]');
    if (fallback) fallback.hidden = false;
    const canvas = this.querySelector<HTMLElement>('[data-canvas]');
    if (canvas) canvas.inert = true;
    map?.destroy();
    canvas?.replaceChildren();
  }

  private async initialize(generation: number): Promise<void> {
    const canvas = this.querySelector<HTMLElement>('[data-canvas]');
    const template = this.querySelector<HTMLTemplateElement>('template');
    const fallback = this.querySelector<HTMLElement>('[data-fallback]');
    const message = this.querySelector<HTMLElement>('[data-message]');
    if (!canvas || !template || !fallback || !message || !this.dataset.preview) return;

    canvas.inert = true;
    message.textContent = 'Загружаем карту…';
    try {
      // This payload is rendered from the validated domain Place by the Astro component.
      const data = JSON.parse(this.dataset.preview) as PlacePreviewData;
      await loadYandexMaps();
      if (!this.isConnected || generation !== this.generation) return;
      const maps = window.ymaps3;
      if (!maps) throw new Error('Yandex Maps API is unavailable');

      const location = getPreviewLocation(data);
      const map = new maps.YMap(
        canvas,
        {
          location,
          margin: [32, 32, 64, 32],
          behaviors: [],
          mode: 'vector'
        },
        [new maps.YMapDefaultSchemeLayer({}), new maps.YMapDefaultFeaturesLayer({})]
      );
      this.map = map;

      let rendered = false;
      const handOff = (): void => {
        if (this.map !== map) return;
        const logo = canvas.querySelector('.ymaps3--map-copyrights__logo');
        logo?.setAttribute('aria-label', 'Яндекс Карты');
        if (!rendered) return;
        // The SDK loads this native action independently of its tile renderer.
        const button = canvas.querySelector('.ymaps3--open-maps-button')?.closest('button');
        if (!button || button.disabled) return;
        canvas.inert = false;
        if (fallback.contains(document.activeElement)) button.focus({ preventScroll: true });
        fallback.hidden = true;
        if (logo) {
          this.actionObserver?.disconnect();
          this.actionObserver = undefined;
        }
      };
      this.actionObserver = new MutationObserver(handOff);
      this.actionObserver.observe(canvas, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled']
      });

      const geometry = data.geometry?.area.geometry;
      if (geometry) {
        const water = getComputedStyle(this).getPropertyValue('--color-water').trim();
        map.addChild(
          new maps.YMapFeature({
            geometry: toMapGeometry(geometry),
            style: {
              fill: water,
              fillOpacity: 0.06,
              stroke: [{ color: water, width: 2, opacity: 0.85, dash: [5, 3] }],
              interactive: false,
              simplificationRate: 0
            }
          })
        );
      }

      // YMap moves marker DOM into its canvas; retain the template for reconnects.
      const marker = template.content.firstElementChild?.cloneNode(true);
      if (!(marker instanceof HTMLElement)) throw new Error('Place marker is unavailable');
      const openingHours = data.openingHours;
      if (openingHours) {
        const refreshMarker = (): void => {
          marker.dataset.open = String(isPlaceOpen(openingHours));
        };
        refreshMarker();
        this.markerUpdateTimer = window.setInterval(refreshMarker, 60_000);
      }
      map.addChild(
        new maps.YMapMarker({ coordinates: [data.coordinates.lng, data.coordinates.lat] }, marker)
      );
      map.addChild(
        new maps.YMapListener({
          onStateChanged: (state) => {
            if (this.map !== map) return;
            const tiles = state.getLayerState(
              `${maps.YMapDefaultSchemeLayer.defaultProps.source}:ground`,
              'tile'
            );
            rendered = !!tiles && tiles.tilesTotal > 0 && tiles.tilesReady === tiles.tilesTotal;
            handOff();
          },
          onResize: () => {
            if (this.map !== map) return;
            try {
              map.update({ location: getPreviewLocation(data) });
            } catch (error) {
              this.clearMap();
              message.textContent = 'Карта не загрузилась.';
              console.error('Place preview resize:', error);
            }
          }
        })
      );
    } catch (error) {
      if (!this.isConnected || generation !== this.generation) return;
      this.clearMap();
      message.textContent = 'Карта не загрузилась.';
      console.error('Place preview:', error);
    }
  }

  disconnectedCallback(): void {
    ++this.generation;
    this.clearMap();
  }
}
