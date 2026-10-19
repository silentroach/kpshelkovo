import type { YMap, YMapMarker } from '@yandex/ymaps3-types';

import { PARCEL_LABEL_MIN_ZOOM } from '@/components/places/parcel-label';
import type { EditorialParcelLabel } from '@/lib/geometry/editorial-map-labels.types';

export const createEditorialParcelLabels = (
  sdk: typeof ymaps3,
  map: YMap,
  labels: readonly EditorialParcelLabel[]
): {
  readonly update: (zoom: number) => void;
  readonly destroy: () => void;
} => {
  const markers: YMapMarker[] = [];
  for (const label of labels) {
    const element = document.createElement('span');
    element.className = 'editorial-parcel-label';
    element.textContent = label.text;
    markers.push(new sdk.YMapMarker({ coordinates: [...label.coordinates], zIndex: -1 }, element));
  }
  let visible = false;
  const addMarkers = (): void => {
    for (const marker of markers) map.addChild(marker);
  };
  const removeMarkers = (): void => {
    if (!visible) return;
    visible = false;
    for (const marker of markers) map.removeChild(marker);
  };
  const update = (zoom: number): void => {
    const shouldShow = zoom >= PARCEL_LABEL_MIN_ZOOM;
    if (visible === shouldShow) return;
    if (shouldShow) {
      visible = true;
      addMarkers();
    } else removeMarkers();
  };
  return { update, destroy: removeMarkers };
};
