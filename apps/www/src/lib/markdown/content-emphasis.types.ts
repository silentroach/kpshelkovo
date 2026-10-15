import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type EmphasisNode = ReturnType<typeof parseMarkdownFragment>[number];
export type EmphasisParagraph = Extract<EmphasisNode, { type: 'paragraph' }>;
export type EmphasisQuote = Extract<EmphasisNode, { type: 'blockquote' }>;
export type EmphasisKind = 'note' | 'warning';
export type EmphasisOutput = 'html' | 'markdown';
