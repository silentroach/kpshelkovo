import type { md, parseMarkdownFragment } from '@shelkovo/markdown';

export type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
export type MarkdownListItem = ReturnType<typeof md.listItem>;

export interface LlmsSection {
  readonly title: string;
  readonly children: readonly MarkdownNode[];
}

export interface LlmsDocument {
  readonly title: string;
  readonly summary: string;
  readonly introduction?: readonly MarkdownNode[];
  readonly sections: readonly LlmsSection[];
}
