import type { LngLat } from '@yandex/ymaps3-types';

/** Равномерный сдвиг в Mercator; метры на земле на опорной широте. */
export const createDisplayOffset = (
  eastMeters: number,
  northMeters: number,
  referenceLatitude: number
): ((position: LngLat) => LngLat) => {
  if (eastMeters === 0 && northMeters === 0) return (position) => position;
  const radians = Math.PI / 180;
  const scale = 6378137 * Math.cos(referenceLatitude * radians);
  return ([lng, lat]) => [
    lng + eastMeters / scale / radians,
    Math.atan(
      Math.sinh(Math.log(Math.tan(Math.PI / 4 + (lat * radians) / 2)) + northMeters / scale)
    ) / radians
  ];
};
