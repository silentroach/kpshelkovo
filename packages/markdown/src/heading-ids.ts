import type { Heading, PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';

import type { AuthoredHeadingIds } from './heading-ids.types';
import { headingSlug, uniqueHeadingSlug } from './heading-slugs';

export const phrasingText = (node: PhrasingContent): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node) {
    return node.children.map(phrasingText).join('');
  }

  return '';
};

export const headingText = (heading: Heading): string =>
  heading.children.map(phrasingText).join('').trim();

/** Reserve every authored heading before app transforms insert their own nodes. */
export const assignAuthoredHeadingIds = (
  tree: Root,
  reservedIds?: readonly string[]
): AuthoredHeadingIds => {
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

  headings.forEach((node) => {
    const id = reserveId(headingText(node));
    authoredIds.set(node, id);
    node.data = {
      ...node.data,
      hProperties: { ...node.data?.hProperties, id }
    };
  });

  return { authoredIds, reserveId };
};
