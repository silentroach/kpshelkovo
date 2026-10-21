export const INVENTORY_GROUPS = ['construction', 'garden', 'home'] as const;

export type InventoryGroupId = (typeof INVENTORY_GROUPS)[number];

const GROUP_TITLES: Readonly<Record<InventoryGroupId, string>> = {
  construction: 'Строительство и ремонт',
  garden: 'Сад и участок',
  home: 'Дом и уборка'
};

const GROUP_EMOJI: Readonly<Record<InventoryGroupId, string>> = {
  construction: '🛠️',
  garden: '🌱',
  home: '🧹'
};

export const isInventoryGroup = (value: string): value is InventoryGroupId =>
  INVENTORY_GROUPS.some((group) => group === value);

export const formatInventoryGroup = (group: InventoryGroupId): string => GROUP_TITLES[group];

export const formatInventoryGroupEmoji = (group: InventoryGroupId): string => GROUP_EMOJI[group];
