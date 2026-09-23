import type { PolygonPosition } from './types.ts';

const EARTH_RADIUS_M = 6_378_137;
const RADIANS = Math.PI / 180;

export const toWebMercator = ([lng, lat]: PolygonPosition): PolygonPosition => [
  EARTH_RADIUS_M * lng * RADIANS,
  EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (lat * RADIANS) / 2))
];

export const fromWebMercator = ([x, y]: PolygonPosition): PolygonPosition => [
  (x / EARTH_RADIUS_M) * (180 / Math.PI),
  (2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) * (180 / Math.PI)
];

/** East/north ground metres at the reference latitude, converted to a uniform Mercator shift. */
export const createDisplayOffset = (
  eastMeters: number,
  northMeters: number,
  referenceLatitude: number
): ((position: PolygonPosition) => PolygonPosition) => {
  if (eastMeters === 0 && northMeters === 0) return (position) => position;
  const scale = Math.cos(referenceLatitude * RADIANS);
  return (position) => {
    const [x, y] = toWebMercator(position);
    return fromWebMercator([x + eastMeters / scale, y + northMeters / scale]);
  };
};
