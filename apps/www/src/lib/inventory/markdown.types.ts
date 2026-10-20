import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type InventoryMarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

/** Structural view used only to direct body links to canonical HTML targets. */
export interface InventoryMarkdownBodyNode {
  readonly type: string;
  readonly children?: readonly InventoryMarkdownBodyNode[];
  url?: string;
}
