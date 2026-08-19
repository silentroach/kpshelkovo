import { formatDate } from '@shelkovo/format';

import type { PlaceCategory, PlaceStatus } from './schema';
import type { PlaceEvidence } from './types';

const PLACE_CATEGORY_LABELS = {
  entrance: 'Въезды',
  children: 'Для детей',
  sport: 'Спорт',
  walking: 'Прогулки',
  food: 'Еда',
  services: 'Услуги',
  nature: 'Природа',
  water: 'Вода',
  infrastructure: 'Инфраструктура',
} as const satisfies Readonly<Record<PlaceCategory, string>>;

export const formatPlaceCategory = (category: PlaceCategory): string =>
  PLACE_CATEGORY_LABELS[category];

const PLACE_STATUS_LABELS = {
  existing: 'Существует',
  planned: 'Планируется',
  underConstruction: 'Строится',
} as const satisfies Readonly<Record<PlaceStatus, string>>;

export const formatPlaceStatus = (status: PlaceStatus): string =>
  PLACE_STATUS_LABELS[status];

export const formatPlaceEvidenceDate = (evidence: PlaceEvidence): string =>
  formatDate(evidence.checkedIso);
