import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type MarkdownIconNode = ReturnType<typeof parseMarkdownFragment>[number] & {
  readonly children?: readonly MarkdownIconNode[];
};

export type MarkdownIconLink = Extract<MarkdownIconNode, { readonly type: 'link' }>;

export interface MarkdownIconPath {
  readonly d: string;
  readonly fill?: string;
}
