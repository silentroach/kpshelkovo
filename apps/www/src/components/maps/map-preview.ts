import type { LngLat, Margin, YMap, YMapLocationRequest } from '@yandex/ymaps3-types';

import { createEditorialMapObjects, getEditorialMapBounds } from '@/components/maps/editorial-map';
import { isPlaceOpen } from '@/lib/places/opening-hours';
import { createOpenMapsControl, OPEN_MAPS_BUTTON_TITLE } from '@/lib/yandex-maps/open-maps-control';
import { installYandexMapsRuntimeHeadPersistence, loadYandexMaps } from '@/lib/yandex-maps/runtime';

import { installMapPreviewGestures } from './map-gestures';
import type { MapPreviewData } from './map-preview.types';

export const getPreviewLocation = (data: MapPreviewData): YMapLocationRequest => {
  const point: LngLat = [data.coordinates.lng, data.coordinates.lat];
  if (!data.geometry?.features.length)
    return { center: point, zoom: data.zoom ?? 16.5, duration: 0 };

  const bounds = getEditorialMapBounds(data.geometry, [point]);
  return bounds ? { bounds, duration: 0 } : { center: point, zoom: data.zoom ?? 16.5, duration: 0 };
};

export const getPreviewMargin = (
  width: number,
  height: number,
  anchor?: MapPreviewData['anchor']
): Margin => {
  if (!anchor) return [32, 32, 64, 32];
  const [x, y] = anchor;
  // The canonical point stays at location.center, the center of the unpadded viewport.
  return [
    Math.max(0, 2 * y - 1) * height,
    Math.max(0, 1 - 2 * x) * width,
    Math.max(0, 1 - 2 * y) * height,
    Math.max(0, 2 * x - 1) * width
  ];
};

export class MapPreviewElement extends HTMLElement {
  private generation = 0;
  private map?: YMap;
  private intersectionObserver?: IntersectionObserver;
  private sizeObserver?: ResizeObserver;
  private actionObserver?: MutationObserver;
  private markerUpdateTimer?: number;
  private gestureController?: AbortController;

  connectedCallback(): void {
    installYandexMapsRuntimeHeadPersistence();
    const message = this.querySelector<HTMLElement>('[data-message]');
    if (message) message.hidden = true;
    const generation = ++this.generation;
    let nearby = false;
    const start = (): void => {
      if (
        !this.isConnected ||
        generation !== this.generation ||
        !this.intersectionObserver ||
        !nearby ||
        this.clientWidth === 0 ||
        this.clientHeight === 0
      )
        return;
      this.stopWaiting();
      void this.initialize(generation);
    };
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        nearby = entries.some((entry) => entry.target === this && entry.isIntersecting);
        start();
      },
      { rootMargin: '200px' }
    );
    this.intersectionObserver.observe(this);
    // A zero-sized intersecting element need not cross an IO threshold when shown.
    this.sizeObserver = new ResizeObserver(start);
    this.sizeObserver.observe(this);
  }

  private stopWaiting(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.sizeObserver?.disconnect();
    this.sizeObserver = undefined;
  }

  private clearMap(): void {
    this.stopWaiting();
    const map = this.map;
    this.map = undefined;
    this.gestureController?.abort();
    this.gestureController = undefined;
    this.actionObserver?.disconnect();
    this.actionObserver = undefined;
    window.clearInterval(this.markerUpdateTimer);
    this.markerUpdateTimer = undefined;
    const canvas = this.querySelector<HTMLElement>('[data-canvas]');
    map?.destroy();
    canvas?.replaceChildren();
  }

  private async initialize(generation: number): Promise<void> {
    const canvas = this.querySelector<HTMLElement>('[data-canvas]');
    const template = this.querySelector<HTMLTemplateElement>('template');
    const message = this.querySelector<HTMLElement>('[data-message]');
    if (!canvas || !template || !this.dataset.preview) return;

    if (message) message.hidden = true;
    try {
      // Astro serializes this payload from the adapters' validated domain data.
      const data = JSON.parse(this.dataset.preview) as MapPreviewData;
      await loadYandexMaps();
      if (!this.isConnected || generation !== this.generation) return;
      const maps = window.ymaps3;
      if (!maps) throw new Error('Yandex Maps API is unavailable');

      const location = getPreviewLocation(data);
      const map = new maps.YMap(
        canvas,
        {
          location,
          margin: getPreviewMargin(canvas.clientWidth, canvas.clientHeight, data.anchor),
          behaviors: data.interactive ? ['pinchZoom'] : [],
          mode: 'vector',
          copyrightsPosition: data.copyrightsPosition ?? 'bottom left',
          distributionPosition: data.distributionPosition ?? 'top right'
        },
        [
          new maps.YMapDefaultSchemeLayer({
            customization: [
              {
                stylers: data.muted ? { saturation: -0.4, lightness: 0.2 } : { saturation: -0.3 }
              }
            ]
          }),
          new maps.YMapDefaultFeaturesLayer({})
        ]
      );
      this.map = map;

      if (data.interactive) {
        this.gestureController = installMapPreviewGestures(this, map);
      }

      let controlInstalled = false;
      const updateActions = (): void => {
        if (this.map !== map) return;
        const logo = canvas.querySelector('.ymaps3--map-copyrights__logo');
        logo?.setAttribute('aria-label', 'Яндекс Карты');
        for (const label of canvas.querySelectorAll('.ymaps3--open-maps-button')) {
          const button = label.closest('button');
          if (
            !button ||
            (controlInstalled &&
              button.closest('.ymaps3--control') &&
              label.textContent?.trim() === OPEN_MAPS_BUTTON_TITLE &&
              !button.dataset.previewAutoAction)
          )
            continue;
          // The SDK's automatic action is not the control we install; keep the scene usable.
          button.dataset.previewAutoAction = 'true';
          button.inert = true;
        }
      };
      this.actionObserver = new MutationObserver(updateActions);
      this.actionObserver.observe(canvas, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled']
      });
      updateActions();

      if (data.geometry) {
        for (const object of createEditorialMapObjects(maps, data.geometry)) map.addChild(object);
      }

      // YMap moves marker DOM into its canvas; retain the template for reconnects.
      const marker = template.content.firstElementChild?.cloneNode(true);
      if (!(marker instanceof HTMLElement)) throw new Error('Map preview marker is unavailable');
      if (marker instanceof HTMLAnchorElement && marker.href) {
        // Preserve the browser's link menu before the SDK cancels context menus.
        marker.addEventListener('contextmenu', (event) => event.stopPropagation());
      }
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
          onResize: ({ size }) => {
            if (this.map !== map || size.x === 0 || size.y === 0) return;
            try {
              map.update({
                location: getPreviewLocation(data),
                margin: getPreviewMargin(size.x, size.y, data.anchor)
              });
            } catch (error) {
              this.clearMap();
              if (message) message.hidden = false;
              console.error('Map preview resize:', error);
            }
          }
        })
      );
      const control = await createOpenMapsControl(maps, data.distributionPosition ?? 'top right');
      if (!this.isConnected || generation !== this.generation || this.map !== map) return;
      controlInstalled = true;
      map.addChild(control);
      updateActions();
    } catch (error) {
      if (!this.isConnected || generation !== this.generation) return;
      this.clearMap();
      if (message) message.hidden = false;
      console.error('Map preview:', error);
    }
  }

  disconnectedCallback(): void {
    ++this.generation;
    this.clearMap();
  }
}
