import rehypeStringify from 'rehype-stringify';
import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified, type Plugin } from 'unified';

import { uniqueHeadingSlug } from './heading-slugs';
import type { HtmlTreeNode } from './html-tree.types';
import { rehypeMarkdownImages } from './image-figures';
import { assertNoMarkdownTables } from './no-tables';
import { rehypeTaskListItemLabels } from './task-list-labels';
import { expandTableOfContents } from './toc';
import { rehypeTypograf } from './typography';

export type MarkdownPreprocessor = (markdown: string) => string;

export interface RenderOptions {
  readonly preprocess?: MarkdownPreprocessor | readonly MarkdownPreprocessor[];
}

const remarkNoMarkdownTables: Plugin<[], Root> = () => (tree) => {
  assertNoMarkdownTables(tree);
};

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const HEADING_ANCHOR_LABEL = 'Ссылка на этот раздел';

const nodeText = (node: HtmlTreeNode): string => {
  if (typeof node.value === 'string') {
    return node.value;
  }

  return node.children?.map(nodeText).join('') ?? '';
};

const headingAnchor = (slug: string): HtmlTreeNode => ({
  type: 'element',
  tagName: 'a',
  properties: {
    ariaLabel: HEADING_ANCHOR_LABEL,
    className: ['ui-heading-anchor'],
    // Keep the visible "#" permalink marker out of the Pagefind index.
    dataPagefindIgnore: 'all',
    href: `#${slug}`,
    title: HEADING_ANCHOR_LABEL,
  },
  children: [
    {
      type: 'element',
      tagName: 'span',
      properties: {
        ariaHidden: 'true',
      },
      children: [
        {
          type: 'text',
          value: '#',
        },
      ],
    },
  ],
});

const addHeadingIds = (
  node: HtmlTreeNode,
  seenSlugs: Map<string, number>,
): void => {
  if (node.tagName && HEADING_TAGS.has(node.tagName)) {
    const headingText = nodeText(node);
    const slug = uniqueHeadingSlug(headingText, seenSlugs);

    node.properties = node.properties ?? {};
    node.properties.id = slug;
    // The anchor is kept inside the heading for visual positioning and keyboard
    // access. Without an explicit name, the anchor's aria-label would be
    // concatenated into the heading's accessible name. Pin the heading name to
    // its text content so screen-reader heading navigation stays clean.
    node.properties.ariaLabel = headingText;
    node.children = [...(node.children ?? []), headingAnchor(slug)];
  }

  node.children?.forEach((child) => addHeadingIds(child, seenSlugs));
};

const rehypeHeadingIds: Plugin<[], HtmlTreeNode> = () => (tree) => {
  addHeadingIds(tree, new Map());
};

const remarkTableOfContents: Plugin<[], Root> = () => (tree) =>
  expandTableOfContents(tree);

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkTableOfContents)
  .use(remarkNoMarkdownTables)
  // Raw HTML is not passed through, so markdown content cannot inject markup.
  .use(remarkRehype)
  .use(rehypeHeadingIds)
  .use(rehypeTaskListItemLabels)
  .use(rehypeMarkdownImages)
  .use(rehypeTypograf)
  .use(rehypeStringify);

const preprocessMarkdown = (
  markdown: string,
  preprocess: RenderOptions['preprocess'],
): string => {
  if (!preprocess) {
    return markdown;
  }

  if (typeof preprocess === 'function') {
    return preprocess(markdown);
  }

  return preprocess.reduce((value, fn) => fn(value), markdown);
};

export const render = (markdown: string, options?: RenderOptions): string => {
  const processed = preprocessMarkdown(markdown, options?.preprocess);

  return String(processor.processSync(processed));
};
