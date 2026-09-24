import type { PlaceStatus } from './schema';

const PLACE_STATUS_LABELS = {
  existing: 'Существует',
  planned: 'Планируется',
  underConstruction: 'Строится'
} as const satisfies Readonly<Record<PlaceStatus, string>>;

export const formatPlaceStatus = (status: PlaceStatus): string => PLACE_STATUS_LABELS[status];
