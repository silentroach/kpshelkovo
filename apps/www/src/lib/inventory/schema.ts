export const INVENTORY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isInventoryId = (value: string): boolean => INVENTORY_ID.test(value);
