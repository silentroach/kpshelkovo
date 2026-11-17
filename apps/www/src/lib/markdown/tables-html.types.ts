import type { MarkdownAstTransform } from '@shelkovo/markdown';

export type MarkdownTableDocument = Parameters<MarkdownAstTransform>[0];
export type MarkdownTableContainer = Pick<MarkdownTableDocument, 'children'>;
export type MarkdownTableWrapper = Extract<
  MarkdownTableDocument['children'][number],
  { type: 'blockquote' }
>;
