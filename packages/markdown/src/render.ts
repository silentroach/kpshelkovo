import type { Heading, Root } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified, type Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import { headingSlug, uniqueHeadingSlug } from './heading-slugs';
import type { HtmlTreeNode } from './html-tree.types';
import { rehypeImageFigures } from './image-figures';
import { assertNoMarkdownTables } from './no-tables';
import type { MarkdownAstTransform, RenderOptions } from './render.types';
import { rehypeTaskListItemLabels } from './task-list-labels';
import { expandTableOfContents, headingText } from './toc';
import { rehypeTypograf } from './typography';

const remarkNoMarkdownTables: Plugin<[], Root> = () => (tree) => {
  assertNoMarkdownTables(tree);
};

const remarkDocument: Plugin<
  [MarkdownAstTransform | undefined, readonly string[] | undefined],
  Root
> = (transform, reservedIds) => (tree) => {
  const usedIds = new Set(reservedIds);
  const authoredIds = new Map<Heading, string>();
  const headings: Heading[] = [];
  let hasFootnotes = false;

  visit(tree, (node) => {
    if (node.type === 'heading') {
      headings.push(node);
    } else if (node.type === 'footnoteReference') {
      hasFootnotes = true;
    }
  });

  const reserveId = (base: string): string => {
    const slug = headingSlug(base);
    // GFM creates these fixed IDs during mdast → hast, after the app hook.
    const footnoteId =
      slug === 'footnote-label' ||
      slug.startsWith('user-content-fn-') ||
      slug.startsWith('user-content-fnref-');
    return uniqueHeadingSlug(hasFootnotes && footnoteId ? `heading-${slug}` : base, usedIds);
  };

  // Reserve the author's headings before app-owned headings can be inserted.
  headings.forEach((node) => {
    const id = reserveId(headingText(node));
    authoredIds.set(node, id);
    node.data = {
      ...node.data,
      hProperties: { ...node.data?.hProperties, id }
    };
  });

  const expanded = expandTableOfContents(tree, authoredIds);
  return transform?.(expanded, reserveId) ?? expanded;
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
    title: HEADING_ANCHOR_LABEL
  },
  children: [
    {
      type: 'element',
      tagName: 'span',
      properties: {
        ariaHidden: 'true'
      },
      children: [
        {
          type: 'text',
          value: '#'
        }
      ]
    }
  ]
});

const collectIds = (node: HtmlTreeNode, usedIds: Set<string>): void => {
  if (typeof node.properties?.id === 'string') {
    usedIds.add(node.properties.id);
  }

  node.children?.forEach((child) => collectIds(child, usedIds));
};

const addHeadingIds = (node: HtmlTreeNode, usedIds: Set<string>): void => {
  if (node.tagName && HEADING_TAGS.has(node.tagName)) {
    const headingText = nodeText(node);
    const slug =
      typeof node.properties?.id === 'string'
        ? node.properties.id
        : uniqueHeadingSlug(headingText, usedIds);

    node.properties = node.properties ?? {};
    node.properties.id = slug;
    // The anchor is kept inside the heading for visual positioning and keyboard
    // access. Without an explicit name, the anchor's aria-label would be
    // concatenated into the heading's accessible name. Pin the heading name to
    // its text content so screen-reader heading navigation stays clean.
    node.properties.ariaLabel = headingText;
    node.children = [...(node.children ?? []), headingAnchor(slug)];
  }

  node.children?.forEach((child) => addHeadingIds(child, usedIds));
};

const rehypeHeadingIds: Plugin<[readonly string[] | undefined], HtmlTreeNode> =
  (reservedIds) => (tree) => {
    const usedIds = new Set(reservedIds);
    collectIds(tree, usedIds);
    addHeadingIds(tree, usedIds);
  };

const createProcessor = (options?: RenderOptions) =>
  unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDocument, options?.transform, options?.reservedIds)
    .use(remarkNoMarkdownTables)
    // Raw HTML is not passed through, so markdown content cannot inject markup.
    .use(remarkRehype)
    .use(rehypeHeadingIds, options?.reservedIds)
    .use(rehypeTaskListItemLabels)
    .use(rehypeImageFigures)
    .use(rehypeTypograf)
    .use(rehypeStringify);

const preprocessMarkdown = (markdown: string, preprocess: RenderOptions['preprocess']): string => {
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

  return String(
    createProcessor(options).processSync({
      value: processed,
      data: { eagerImages: options?.eagerImages }
    })
  );
};
