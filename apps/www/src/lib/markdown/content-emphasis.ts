import {
  createMarkdownDocument,
  extractFirstMarkdownText,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import type {
  EmphasisKind,
  EmphasisNode,
  EmphasisOutput,
  EmphasisParagraph,
  EmphasisQuote
} from './content-emphasis.types';

/** A marker must occupy the first line, not an inline-code or other Markdown node. */
const takeMarker = (paragraph: EmphasisParagraph, marker: string): boolean => {
  const first = paragraph.children[0];
  if (first?.type !== 'text') return false;
  const lineEnd = first.value.indexOf('\n');
  const line = lineEnd < 0 ? first.value : first.value.slice(0, lineEnd);
  if (line !== marker) return false;
  if (lineEnd < 0 && paragraph.children.length > 1) return false;
  const rest = lineEnd < 0 ? '' : first.value.slice(lineEnd + 1);
  if (rest) first.value = rest;
  else paragraph.children.shift();
  return true;
};

const emphasisKind = (paragraph: EmphasisParagraph): EmphasisKind | undefined => {
  if (takeMarker(paragraph, '[!NOTE]')) return 'note';
  if (takeMarker(paragraph, '[!WARNING]')) return 'warning';
  return;
};

const transformQuote = (quote: EmphasisQuote, output: EmphasisOutput): void => {
  const first = quote.children[0];
  if (first?.type !== 'paragraph') return;
  const kind = emphasisKind(first);
  if (!kind) return;
  if (!first.children.length) quote.children.shift();

  const candidate = quote.children[0];
  const title =
    candidate?.type === 'paragraph' &&
    candidate.children.length === 1 &&
    candidate.children[0]?.type === 'strong'
      ? candidate
      : md.paragraph([
          { type: 'strong', children: [md.text(kind === 'note' ? 'Примечание' : 'Внимание')] }
        ]);
  if (title !== candidate) quote.children.unshift(title);
  if (output === 'html') {
    quote.data = {
      hName: 'aside',
      hProperties: { className: ['ui-callout', `ui-callout--${kind}`] }
    };
    title.data = { hProperties: { className: ['ui-callout__title'] } };
  }

  for (const child of quote.children) {
    if (child.type === 'paragraph' && takeMarker(child, '[!SOURCE]') && output === 'html') {
      child.data = { hProperties: { className: ['ui-callout__source'] } };
    }
  }
};

/** Work on the existing document tree so references, mentions and maps retain their context. */
export const transformContentEmphasis = (
  nodes: readonly EmphasisNode[],
  output: EmphasisOutput
): readonly EmphasisNode[] => {
  for (const node of nodes) {
    switch (node.type) {
      case 'blockquote':
        transformQuote(node, output);
        transformContentEmphasis(node.children, output);
        break;
      case 'list':
        for (const item of node.children) transformContentEmphasis(item.children, output);
        break;
      case 'footnoteDefinition':
        transformContentEmphasis(node.children, output);
        break;
      default:
        break;
    }
  }
  return nodes;
};

export const extractFirstContentText = (markdown: string): string | undefined => {
  if (!markdown.includes('[!NOTE]') && !markdown.includes('[!WARNING]')) {
    return extractFirstMarkdownText(markdown);
  }
  const children = transformContentEmphasis(parseMarkdownFragment(markdown), 'markdown');
  return extractFirstMarkdownText(serializeMarkdownDocument(createMarkdownDocument({ children })));
};
