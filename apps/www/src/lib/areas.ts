export const AREAS = ['river', 'forest', 'park', 'village'] as const;
export type Area = (typeof AREAS)[number];

const AREA_LABELS: Record<Area, string> = {
  river: 'Шелково Ривер',
  forest: 'Шелково Форест',
  park: 'Шелково Парк',
  village: 'Шелково Вилладж'
};

export const formatArea = (area: Area): string => AREA_LABELS[area];
