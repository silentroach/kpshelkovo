export const PLACE_CATEGORIES = [
  'entrance',
  'children',
  'sport',
  'walking',
  'food',
  'services',
  'nature',
  'water',
  'infrastructure',
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const PLACE_MARKERS = [
  'apple',
  'foodtruck',
  'titanic',
  'construction',
  'fish',
  'kpp',
] as const;
export type PlaceMarker = (typeof PLACE_MARKERS)[number];

export const PLACE_STATUSES = [
  'existing',
  'planned',
  'underConstruction',
] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export const PLACE_WEEKDAYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;
export type PlaceWeekday = (typeof PLACE_WEEKDAYS)[number];

export const PLACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PLACE_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const PLACE_MAP_BOUNDS = {
  minLat: 55.049,
  maxLat: 55.081,
  minLng: 37.709,
  maxLng: 37.764,
} as const;
