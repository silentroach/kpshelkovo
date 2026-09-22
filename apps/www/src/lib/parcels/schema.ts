export const PARCEL_PARTS = ['shr', 'shf', 'shp', 'shv'] as const;
export type ParcelPart = (typeof PARCEL_PARTS)[number];

export const PARCEL_STATUSES = ['available', 'reserved', 'sold', 'unavailable'] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export const PARCEL_FEATURES = [
  'meadow',
  'trees',
  'forest_plot',
  'forest_border',
  'forest_view',
  'forest_access',
  'river_access',
  'near_river',
  'near_forest',
  'beach',
  'pond',
  'near_park',
  'forest_park'
] as const;
export type ParcelFeature = (typeof PARCEL_FEATURES)[number];

export const PARCEL_CODE = /^(?:SHR|SHF|SHP|SHV)-[A-Z]+[0-9]+$/;
