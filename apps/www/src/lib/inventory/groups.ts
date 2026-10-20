export const INVENTORY_GROUPS = ['construction', 'garden', 'home'] as const;

export type InventoryGroupId = (typeof INVENTORY_GROUPS)[number];

const GROUP_TITLES: Readonly<Record<InventoryGroupId, string>> = {
  construction: 'Стройка и ремонт',
  garden: 'Сад и участок',
  home: 'Дом и уборка'
};

export const isInventoryGroup = (value: string): value is InventoryGroupId =>
  INVENTORY_GROUPS.some((group) => group === value);

export const formatInventoryGroup = (group: InventoryGroupId): string => GROUP_TITLES[group];
