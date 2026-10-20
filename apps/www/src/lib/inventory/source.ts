import { isInventoryId } from './schema';

export const inventorySourceId = (entry: string): string => {
  const id = entry.endsWith('.md') ? entry.slice(0, -3) : '';
  if (!isInventoryId(id)) {
    throw new Error(
      `inventory source "${entry}" must be a flat Markdown filename using lower-case Latin letters, digits, and hyphen`
    );
  }
  return id;
};
