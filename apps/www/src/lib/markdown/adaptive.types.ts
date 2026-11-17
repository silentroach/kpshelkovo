import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type AdaptiveNode = ReturnType<typeof parseMarkdownFragment>[number];
export type AdaptiveOutput = 'html' | 'mobile';
export type AdaptiveBlocks = Extract<AdaptiveNode, { type: 'blockquote' }>['children'];

export interface AdaptiveScanNode {
  readonly type: string;
  readonly value?: string;
  readonly children?: readonly AdaptiveScanNode[];
  readonly position?: {
    readonly start: { readonly line: number; readonly column: number };
  };
}
