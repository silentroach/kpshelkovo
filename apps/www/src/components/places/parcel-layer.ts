import type {
  DrawingStyle,
  LngLatBounds,
  MultiPolygonGeometry,
  PolygonGeometry,
  YMap,
  YMapFeature,
  YMapMarker
} from '@yandex/ymaps3-types';

import type { ParcelPart } from '@/lib/parcels/schema';

import type { ParcelLayer, ParcelMapItem } from './parcel-layer-types';

const LABEL_MIN_ZOOM = 17;
const SELECTION_MS = 5_000;

const toMapGeometry = (
  geometry: ParcelMapItem['geometry']
): PolygonGeometry | MultiPolygonGeometry =>
  geometry.type === 'Polygon'
    ? {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat]))
      }
    : {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) => ring.map(([lng, lat]) => [lng, lat]))
        )
      };

export const createParcelLayer = (
  map: YMap,
  sdk: typeof ymaps3,
  container: HTMLElement,
  onExpiry: () => void,
  getDuration: () => number
): ParcelLayer => {
  const itemsByPart = new Map<ParcelPart, readonly ParcelMapItem[]>();
  const features = new Map<string, YMapFeature>();
  const labels = new Map<string, YMapMarker>();
  let selected: ParcelMapItem | undefined;
  let timer: number | undefined;
  let destroyed = false;
  let viewportZoom = map.zoom;
  let viewportBounds = map.bounds;

  const token = (name: string): string => {
    const value =
      getComputedStyle(container).getPropertyValue(name).trim() ||
      document.documentElement.style.getPropertyValue(name).trim();
    if (!value) throw new Error(`Не найден цвет карты ${name}`);
    return value;
  };
  const normalStyle = (item: ParcelMapItem): DrawingStyle => {
    const fill =
      item.status === 'available' || item.status === 'reserved'
        ? token('--color-accent')
        : item.status === 'unavailable'
          ? 'oklch(88% 0 0)'
          : undefined;
    return {
      zIndex: -1,
      interactive: true,
      simplificationRate: 0,
      ...(fill
        ? { fill, fillOpacity: item.status === 'unavailable' ? 0.25 : 0.22 }
        : { fillOpacity: 0 }),
      stroke: [
        {
          color: token('--color-text-muted'),
          width: 1,
          opacity: item.status === 'unavailable' ? 0.2 : 0.5
        }
      ]
    };
  };
  const selectedStyle = (): DrawingStyle => ({
    zIndex: -1,
    interactive: true,
    simplificationRate: 0,
    fill: token('--color-accent'),
    fillOpacity: 0.3,
    stroke: [{ color: token('--color-accent-text'), width: 3 }]
  });

  const clearSelection = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    if (selected) features.get(selected.code)?.update({ style: normalStyle(selected) });
    selected = undefined;
  };

  const select = (item: ParcelMapItem): void => {
    clearSelection();
    selected = item;
    features.get(item.code)?.update({ style: selectedStyle() });
    timer = window.setTimeout(() => {
      timer = undefined;
      clearSelection();
      onExpiry();
    }, SELECTION_MS);
  };

  const updateViewport = (zoom: number, bounds: LngLatBounds): void => {
    viewportZoom = zoom;
    viewportBounds = bounds;
    if (!itemsByPart.size || destroyed) return;

    const visible = new Set<string>();
    if (zoom >= LABEL_MIN_ZOOM) {
      for (const items of itemsByPart.values())
        for (const item of items) {
          const [lng, lat] = item.labelCoordinates;
          if (
            lng < Math.min(bounds[0][0], bounds[1][0]) ||
            lng > Math.max(bounds[0][0], bounds[1][0]) ||
            lat < Math.min(bounds[0][1], bounds[1][1]) ||
            lat > Math.max(bounds[0][1], bounds[1][1])
          )
            continue;
          visible.add(item.code);
          if (labels.has(item.code)) continue;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'parcel-map-label';
          if (item.status === 'unavailable') button.classList.add('parcel-map-label--unavailable');
          const text = document.createElement('span');
          text.textContent = item.code.split('-')[1] ?? item.code;
          button.append(text);
          button.title = item.code;
          button.setAttribute('aria-label', `Выбрать участок ${item.code}`);
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            select(item);
          });
          const marker = new sdk.YMapMarker({ coordinates: [lng, lat], zIndex: -1 }, button);
          labels.set(item.code, marker);
          map.addChild(marker);
        }
    }

    for (const [code, marker] of labels) {
      if (visible.has(code)) continue;
      map.removeChild(marker);
      labels.delete(code);
    }
  };

  const disable = (part: ParcelPart): void => {
    const items = itemsByPart.get(part);
    if (!items) return;
    if (selected?.part === part) clearSelection();
    itemsByPart.delete(part);
    for (const item of items) {
      const feature = features.get(item.code);
      if (feature) map.removeChild(feature);
      features.delete(item.code);
      const label = labels.get(item.code);
      if (label) map.removeChild(label);
      labels.delete(item.code);
    }
  };

  return {
    enable(part, parcels) {
      if (destroyed || itemsByPart.has(part)) return;
      itemsByPart.set(part, parcels);
      try {
        for (const item of parcels) {
          const feature = new sdk.YMapFeature({
            id: `parcel-${item.code}`,
            geometry: toMapGeometry(item.geometry),
            style: normalStyle(item),
            onClick: () => select(item)
          });
          features.set(item.code, feature);
          map.addChild(feature);
        }
        updateViewport(viewportZoom, viewportBounds);
      } catch (reason) {
        disable(part);
        throw reason;
      }
    },
    disable,
    focus(code) {
      if (destroyed) return false;
      const part = code.slice(0, 3).toLowerCase() as ParcelPart;
      const item = itemsByPart
        .get(part)
        ?.find((parcel) => parcel.code === code || parcel.aliases?.includes(code));
      if (!item) return false;
      map.update({
        location: {
          center: item.labelCoordinates,
          zoom: LABEL_MIN_ZOOM,
          duration: getDuration(),
          easing: 'ease-in-out'
        }
      });
      select(item);
      return true;
    },
    updateViewport,
    destroy() {
      destroyed = true;
      for (const part of itemsByPart.keys()) disable(part);
    }
  };
};
