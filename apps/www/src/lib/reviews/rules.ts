import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import reviewRulesSource from '@/data/review-rules.md?raw';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

const DISCLAIMER_HEADING = 'Отказ от ответственности';

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const headingText = (heading: MarkdownNode): string => {
  if (
    heading.type !== 'heading' ||
    heading.children.length !== 1 ||
    heading.children[0]?.type !== 'text'
  ) {
    throw new Error('review rules headings must contain plain text');
  }

  return heading.children[0].value;
};

const nodes = parseMarkdownFragment(reviewRulesSource);
const titleNode = nodes[0];
if (titleNode?.type !== 'heading' || titleNode.depth !== 1) {
  throw new Error('review rules must start with an H1 heading');
}

const disclaimerStart = nodes.findIndex(
  (node) =>
    node.type === 'heading' &&
    node.depth === 2 &&
    headingText(node) === DISCLAIMER_HEADING,
);
if (disclaimerStart < 0) {
  throw new Error(`review rules must contain "${DISCLAIMER_HEADING}" section`);
}

const disclaimerEnd = nodes.findIndex(
  (node, index) =>
    index > disclaimerStart && node.type === 'heading' && node.depth <= 2,
);
const disclaimerNodes = nodes.slice(
  disclaimerStart + 1,
  disclaimerEnd < 0 ? nodes.length : disclaimerEnd,
);
if (disclaimerNodes.length === 0) {
  throw new Error(
    `review rules "${DISCLAIMER_HEADING}" section must not be empty`,
  );
}

export const REVIEW_RULES = {
  title: headingText(titleNode),
  markdown: serialize(nodes),
  bodyMarkdown: serialize(nodes.slice(1)),
  disclaimer: {
    heading: DISCLAIMER_HEADING,
    bodyMarkdown: serialize(disclaimerNodes),
  },
} as const;
