import type { HtmlTreeNode } from './html-tree.types';

export type TypographyNodeReplacement = (
  node: HtmlTreeNode,
  parent: HtmlTreeNode,
  replacements: HtmlTreeNode[]
) => void;
