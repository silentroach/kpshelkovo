import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface MarkdownNode {
  readonly type: string;
  readonly children?: readonly MarkdownNode[];
  readonly url?: string;
}

const parser = unified().use(remarkParse).use(remarkGfm);
const INLINE_NODE_TYPES = new Set([
  'break',
  'delete',
  'emphasis',
  'inlineCode',
  'link',
  'strong',
  'text',
]);

const fail = (context: string, message: string): never => {
  throw new Error(`${context} ${message}`);
};

const validateLink = (
  url: string,
  articleUrls: ReadonlySet<string>,
  context: string,
): void => {
  const path = url.split('#', 1)[0] ?? '';

  if (
    !path.startsWith('/news/') ||
    path.startsWith('//') ||
    path.includes('?') ||
    !articleUrls.has(path)
  ) {
    fail(
      context,
      `contains invalid link "${url}"; link to an existing news article with a root-relative URL`,
    );
  }
};

function validateInlineNode(
  node: MarkdownNode,
  articleUrls: ReadonlySet<string>,
  context: string,
): void {
  if (!INLINE_NODE_TYPES.has(node.type)) {
    fail(context, 'may contain only paragraphs with inline formatting');
  }

  if (node.type === 'link') {
    validateLink(node.url ?? '', articleUrls, context);
  }

  for (const child of node.children ?? []) {
    validateInlineNode(child, articleUrls, context);
  }
}

export const validateArchiveSummaryMarkdown = (
  markdown: string,
  articleUrls: ReadonlySet<string>,
  context: string,
): void => {
  const tree = parser.parse(markdown) as MarkdownNode;

  for (const block of tree.children ?? []) {
    if (block.type !== 'paragraph') {
      fail(context, 'may contain only paragraphs with inline formatting');
    }

    for (const child of block.children ?? []) {
      validateInlineNode(child, articleUrls, context);
    }
  }
};
