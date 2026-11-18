import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type TocNode = ReturnType<typeof parseMarkdownFragment>[number];
export type TocContainer = Extract<TocNode, { type: 'blockquote' }>;
