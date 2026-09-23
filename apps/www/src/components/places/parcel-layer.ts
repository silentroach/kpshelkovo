import type {
  DrawingStyle,
  LngLat,
  LngLatBounds,
  Margin,
  MultiPolygonGeometry,
  PolygonGeometry,
  YMap,
  YMapFeature,
  YMapMarker
} from '@yandex/ymaps3-types';

import type { ParcelLayer, ParcelMapItem } from './parcel-layer-types';

const LABEL_MIN_ZOOM = 17;
const SELECTION_MS = 5_000;
const vertices = (geometry: ParcelMapItem['geometry']): readonly LngLat[] =>
  (geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2)).map(
    ([lng, lat]) => [lng, lat]
  );

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

const boundsOf = (points: readonly LngLat[]): LngLatBounds => {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
};

export const createParcelLayer = (
  map: YMap,
  sdk: typeof ymaps3,
  container: HTMLElement,
  onSelection: (text?: string) => void,
  onExpiry: (code: string) => void,
  getViewMargin: () => Margin,
  getDuration: () => number
): ParcelLayer => {
  let items: readonly ParcelMapItem[] = [];
  let features = new Map<string, YMapFeature>();
  let labels = new Map<string, YMapMarker>();
  let selected: ParcelMapItem | undefined;
  let timer: number | undefined;
  let active = false;
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
  const normalStyle = (): DrawingStyle => ({
    zIndex: -1,
    interactive: true,
    simplificationRate: 0,
    fill: token('--color-neutral-soft'),
    fillOpacity: 0.16,
    stroke: [{ color: token('--color-text-muted'), width: 1.5, opacity: 0.8 }]
  });
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
    if (selected) features.get(selected.code)?.update({ style: normalStyle() });
    selected = undefined;
    onSelection();
  };

  const select = (item: ParcelMapItem): void => {
    clearSelection();
    selected = item;
    features.get(item.code)?.update({ style: selectedStyle() });
    onSelection([item.code, ...(item.aliases ?? [])].join(' / '));
    timer = window.setTimeout(() => {
      timer = undefined;
      clearSelection();
      onExpiry(item.code);
    }, SELECTION_MS);
  };

  const updateViewport = (zoom: number, bounds: LngLatBounds): void => {
    viewportZoom = zoom;
    viewportBounds = bounds;
    if (!active || destroyed) return;

    const visible = new Set<string>();
    if (zoom >= LABEL_MIN_ZOOM) {
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
        button.textContent = item.code.split('-')[1] ?? item.code;
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

  const disable = (): void => {
    active = false;
    clearSelection();
    for (const feature of features.values()) map.removeChild(feature);
    features.clear();
    for (const marker of labels.values()) map.removeChild(marker);
    labels.clear();
  };

  return {
    enable(parcels) {
      if (destroyed || active) return;
      items = parcels;
      active = true;
      for (const item of items) {
        const feature = new sdk.YMapFeature({
          id: `parcel-${item.code}`,
          geometry: toMapGeometry(item.geometry),
          style: normalStyle(),
          onClick: () => select(item)
        });
        features.set(item.code, feature);
        map.addChild(feature);
      }
      updateViewport(viewportZoom, viewportBounds);
    },
    disable,
    focus(code) {
      if (!active || destroyed) return false;
      const item = items.find((parcel) => parcel.code === code || parcel.aliases?.includes(code));
      if (!item) return false;
      const bounds = boundsOf(vertices(item.geometry));
      map.update({
        location: { bounds, duration: getDuration(), easing: 'ease-in-out' },
        margin: getViewMargin()
      });
      select(item);
      return true;
    },
    updateViewport,
    destroy() {
      destroyed = true;
      disable();
      items = [];
    }
  };
};
