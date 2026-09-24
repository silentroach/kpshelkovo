import type { LngLat, Margin, YMap, YMapLocationRequest } from '@yandex/ymaps3-types';

import { createOpenMapsControl } from '@/lib/yandex-maps/open-maps-control';
import { installYandexMapsRuntimeHeadPersistence, loadYandexMaps } from '@/lib/yandex-maps/runtime';

import { createEditorialMapObjects, getEditorialMapBounds } from './editorial-map';
import { EditorialMapDataSchema } from './editorial-map-data';
import { installMapPreviewGestures } from './map-gestures';

const MAP_MARGIN: Margin = [32, 32, 64, 32];

export class EditorialMapElement extends HTMLElement {
  private generation = 0;
  private map?: YMap;
  private gestures?: AbortController;
  private observer?: MutationObserver;
  private canvas?: HTMLElement;

  connectedCallback(): void {
    installYandexMapsRuntimeHeadPersistence();
    const generation = ++this.generation;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Карта');
    const canvas = document.createElement('div');
    canvas.className = 'editorial-map__canvas';
    canvas.inert = true;
    const status = document.createElement('span');
    status.className = 'editorial-map__status';
    status.setAttribute('role', 'status');
    status.textContent = 'Загружаем карту…';
    this.replaceChildren(canvas, status);
    this.canvas = canvas;
    void this.initialize(generation, canvas, status);
  }

  private async initialize(
    generation: number,
    canvas: HTMLElement,
    status: HTMLElement
  ): Promise<void> {
    const current = (): boolean => this.isConnected && this.generation === generation;
    try {
      const source = this.dataset.geometry;
      if (!source) throw new Error('Missing map data');
      const collection = EditorialMapDataSchema.parse(JSON.parse(source));
      const bounds = getEditorialMapBounds(collection);
      if (!bounds) throw new Error('Empty map bounds');
      await loadYandexMaps();
      if (!current()) return;
      const maps = window.ymaps3;
      if (!maps) throw new Error('Yandex Maps API is unavailable');

      const frame: YMapLocationRequest = { bounds, duration: 0 };
      const map = new maps.YMap(
        canvas,
        {
          location: frame,
          margin: MAP_MARGIN,
          behaviors: ['pinchZoom'],
          mode: 'vector',
          copyrightsPosition: 'bottom right',
          distributionPosition: 'top right'
        },
        [new maps.YMapDefaultSchemeLayer({}), new maps.YMapDefaultFeaturesLayer({})]
      );
      this.map = map;
      this.gestures = installMapPreviewGestures(this, map);
      for (const object of createEditorialMapObjects(maps, collection)) map.addChild(object);

      let selected: { readonly center: LngLat; readonly zoom: number } | undefined;
      map.addChild(
        new maps.YMapListener({
          onActionStart: ({ location }) => {
            if (this.map !== map) return;
            selected = { center: [...location.center], zoom: location.zoom };
          },
          onUpdate: ({ location, mapInAction }) => {
            if (this.map !== map || !selected || !mapInAction) return;
            selected = { center: [...location.center], zoom: location.zoom };
          },
          onActionEnd: ({ location }) => {
            if (this.map !== map || !selected) return;
            selected = { center: [...location.center], zoom: location.zoom };
          },
          onResize: ({ size }) => {
            if (this.map !== map || !size.x || !size.y) return;
            try {
              map.update({
                location: selected
                  ? { center: selected.center, zoom: selected.zoom, duration: 0 }
                  : { bounds: [[...bounds[0]], [...bounds[1]]], duration: 0 },
                margin: MAP_MARGIN
              });
            } catch {
              this.fail(status);
            }
          }
        })
      );
      if (this.map !== map) return;

      const labelAttribution = (): void => {
        if (this.map !== map) return;
        const logo = canvas.querySelector('.ymaps3--map-copyrights__logo');
        if (!logo) return;
        logo.setAttribute('aria-label', 'Яндекс Карты');
        this.observer?.disconnect();
        this.observer = undefined;
      };
      this.observer = new MutationObserver(labelAttribution);
      this.observer.observe(canvas, { childList: true, subtree: true });
      labelAttribution();

      const control = await createOpenMapsControl(maps, 'top right');
      if (!current() || this.map !== map) return;
      map.addChild(control);
      canvas.inert = false;
      status.hidden = true;
    } catch {
      if (current()) this.fail(status);
    }
  }

  private fail(status: HTMLElement): void {
    this.clearMap();
    status.textContent = 'Карта не загрузилась.';
    status.hidden = false;
  }

  private clearMap(): void {
    this.gestures?.abort();
    this.gestures = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    this.map?.destroy();
    this.map = undefined;
    if (this.canvas) {
      this.canvas.inert = true;
      this.canvas.replaceChildren();
    }
  }

  disconnectedCallback(): void {
    ++this.generation;
    this.clearMap();
    this.canvas = undefined;
  }
}

if (!customElements.get('editorial-map'))
  customElements.define('editorial-map', EditorialMapElement);
