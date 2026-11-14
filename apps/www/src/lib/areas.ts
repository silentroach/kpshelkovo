export const AREAS = ['river', 'forest', 'park', 'village'] as const;
export type Area = (typeof AREAS)[number];

const AREA_LABELS: Readonly<Record<Area, string>> = {
  river: 'Шелково Ривер',
  forest: 'Шелково Форест',
  park: 'Шелково Парк',
  village: 'Шелково Вилладж'
};

export const formatArea = (area: Area): string => AREA_LABELS[area];

const SHORT_AREA_LABELS: Readonly<Record<Area, string>> = {
  river: 'Ривер',
  forest: 'Форест',
  park: 'Парк',
  village: 'Вилладж'
};

export const formatShortArea = (area: Area): string => SHORT_AREA_LABELS[area];
