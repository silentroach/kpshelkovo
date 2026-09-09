import type {
  Heading,
  Link,
  LinkReference,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
  ThematicBreak
} from 'mdast';

import { uniqueHeadingSlug } from './heading-slugs';

const TOC_PLACEHOLDER = '[TOC]';
const TOC_REFERENCE_IDENTIFIER = 'toc';
const TOC_TITLE = 'Содержание';

type TocEntry = {
  readonly depth: Heading['depth'];
  readonly slug: string;
  readonly title: string;
};

type TocBuildResult = {
  readonly items: readonly ListItem[];
  readonly nextIndex: number;
};

const text = (value: string): Text => ({ type: 'text', value });

const tocTitle = (): Paragraph => ({
  type: 'paragraph',
  data: {
    hProperties: {
      className: ['ui-markdown-toc__title']
    }
  },
  children: [
    {
      type: 'strong',
      children: [text(TOC_TITLE)]
    } satisfies Strong
  ]
});

const tocLink = (entry: TocEntry): Link => ({
  type: 'link',
  url: `#${entry.slug}`,
  data: {
    hProperties: {
      href: `#${entry.slug}`
    }
  },
  children: [text(entry.title)]
});

const tocList = (children: readonly ListItem[]): List => ({
  type: 'list',
  ordered: false,
  spread: false,
  children: [...children]
});

const tocRootList = (children: readonly ListItem[]): List => ({
  ...tocList(children),
  data: {
    hProperties: {
      className: ['ui-markdown-toc__list']
    }
  }
});

const tocSeparator = (): ThematicBreak => ({ type: 'thematicBreak' });

const tocListItem = (entry: TocEntry, childLists: readonly List[] = []): ListItem => ({
  type: 'listItem',
  spread: false,
  children: [
    {
      type: 'paragraph',
      children: [tocLink(entry)]
    },
    ...childLists
  ]
});

const phrasingText = (node: PhrasingContent): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node) {
    return node.children.map(phrasingText).join('');
  }

  return '';
};

const headingText = (heading: Heading): string =>
  heading.children.map(phrasingText).join('').trim();

const isTocLinkReference = (child: PhrasingContent): child is LinkReference =>
  child.type === 'linkReference' && child.identifier.toLowerCase() === TOC_REFERENCE_IDENTIFIER;

const isTocPlaceholder = (node: RootContent): boolean => {
  if (node.type !== 'paragraph' || node.children.length !== 1) {
    return false;
  }

  const [child] = node.children;

  return (
    (child.type === 'text' && child.value.trim() === TOC_PLACEHOLDER) || isTocLinkReference(child)
  );
};

const collectTocEntries = (document: Root): readonly TocEntry[] => {
  const seenSlugs = new Map<string, number>();
  const entries: TocEntry[] = [];

  document.children.forEach((node) => {
    if (node.type !== 'heading') {
      return;
    }

    const title = headingText(node);

    if (!title) {
      return;
    }

    const slug = uniqueHeadingSlug(title, seenSlugs);

    if (node.depth > 1) {
      entries.push({ depth: node.depth, slug, title });
    }
  });

  return entries;
};

const buildTocItems = (
  entries: readonly TocEntry[],
  startIndex: number,
  parentDepth: number
): TocBuildResult => {
  const items: ListItem[] = [];
  let index = startIndex;

  while (index < entries.length) {
    const entry = entries[index];

    if (!entry || entry.depth <= parentDepth) {
      break;
    }

    index += 1;

    if (entries[index]?.depth > entry.depth) {
      const childResult = buildTocItems(entries, index, entry.depth);
      items.push(tocListItem(entry, [tocList(childResult.items)]));
      index = childResult.nextIndex;
      continue;
    }

    items.push(tocListItem(entry));
  }

  return { items, nextIndex: index };
};

const buildTocNodes = (entries: readonly TocEntry[]): readonly RootContent[] => {
  if (entries.length === 0) {
    return [];
  }

  return [tocTitle(), tocRootList(buildTocItems(entries, 0, 1).items), tocSeparator()];
};

export const expandTableOfContents = (document: Root): Root => {
  if (!document.children.some(isTocPlaceholder)) {
    return document;
  }

  const entries = collectTocEntries(document);

  return {
    ...document,
    children: document.children.flatMap((node) =>
      isTocPlaceholder(node) ? buildTocNodes(entries) : [node]
    )
  };
};
