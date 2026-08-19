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

export const PLACE_MARKERS = ['foodtruck', 'titanic', 'construction'] as const;
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
export const PLACE_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const PLACE_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const PLACE_MAP_BOUNDS = {
  minLat: 55.049,
  maxLat: 55.081,
  minLng: 37.709,
  maxLng: 37.764,
} as const;

export const isPlaceCalendarDate = (value: string): boolean => {
  if (!PLACE_DATE.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
};
