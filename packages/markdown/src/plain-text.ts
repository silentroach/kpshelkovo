import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const parser = unified().use(remarkParse).use(remarkGfm);
const SPACE = /\s+/gu;
const BLOCK_JOIN_TYPES = new Set([
  'blockquote',
  'list',
  'listItem',
  'table',
  'tableCell',
  'tableRow',
]);
const SKIPPED_NODE_TYPES = new Set(['code', 'definition', 'html', 'yaml']);

interface MarkdownNode {
  readonly type: string;
  readonly value?: string;
  readonly alt?: string;
  readonly children?: readonly MarkdownNode[];
}

const inline = (value: string): string => value.replace(SPACE, ' ').trim();

function text(node: MarkdownNode): string {
  if (SKIPPED_NODE_TYPES.has(node.type)) {
    return '';
  }

  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value ?? '';
  }

  if (node.type === 'image') {
    return node.alt ?? '';
  }

  if (node.type === 'break') {
    return ' ';
  }

  return (node.children ?? [])
    .map(text)
    .join(BLOCK_JOIN_TYPES.has(node.type) ? ' ' : '');
}

export const extractFirstMarkdownText = (
  markdown: string,
): string | undefined => {
  const tree = parser.parse(markdown) as MarkdownNode;

  for (const child of tree.children ?? []) {
    const value = inline(text(child));

    if (value.length > 0) {
      return value;
    }
  }

  return undefined;
};

export const extractMarkdownText = (markdown: string): string | undefined => {
  const tree = parser.parse(markdown) as MarkdownNode;
  const value = inline(
    (tree.children ?? []).map(text).filter(Boolean).join(' '),
  );

  return value || undefined;
};
