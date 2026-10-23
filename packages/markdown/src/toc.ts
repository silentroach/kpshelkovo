import type {
  BlockContent,
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
import type { TocEntry, TocBuildResult, TocGroup } from './toc-annotations.types';

const TOC_PLACEHOLDER = '[TOC]';
const TOC_REFERENCE_IDENTIFIER = 'toc';
const TOC_TITLE = 'Содержание';

const text = (value: string): Text => ({ type: 'text', value });

const linkText = (value: string, className: string): Text => ({
  type: 'text',
  value,
  data: { hName: 'span', hProperties: { className: [className] } }
});

const tocLinkLabel = (title: string): Text[] => {
  const number = /^(\d+(?:\.\d+)*[.):]?)(\s+)([\s\S]+)$/u.exec(title);
  return number
    ? [
        linkText(number[1], 'ui-markdown-toc__number'),
        text(number[2]),
        linkText(number[3], 'ui-markdown-toc__label')
      ]
    : [linkText(title, 'ui-markdown-toc__label')];
};

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
  children: tocLinkLabel(entry.title)
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

export const headingText = (heading: Heading): string =>
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

const collectTocEntries = (
  document: Root,
  authoredIds?: ReadonlyMap<Heading, string>
): readonly TocEntry[] => {
  const seenSlugs = new Set<string>();
  const entries: TocEntry[] = [];
  let group: TocGroup | undefined;

  document.children.forEach((node) => {
    if (node.type === 'leafDirective') {
      group = { title: node.children.map(phrasingText).join('').trim() || undefined };
      return;
    }
    if (node.type !== 'heading') {
      return;
    }

    const title = headingText(node);

    if (!title) {
      return;
    }

    const slug = authoredIds?.get(node) ?? uniqueHeadingSlug(title, seenSlugs);

    if (node.depth > 1) {
      entries.push({ depth: node.depth, slug, title: node.data?.tocTitle ?? title, group });
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

  const groups: BlockContent[] = [];
  const intro = entries.filter((entry) => !entry.group);
  const named = [...new Set(entries.flatMap((entry) => (entry.group ? [entry.group] : [])))];
  named.forEach((group) => {
    const items = entries.filter((entry) => entry.group === group);
    groups.push({
      type: 'blockquote',
      data: {
        tocContainer: true,
        hName: 'div',
        hProperties: { className: ['ui-markdown-toc__group'] }
      },
      children: [
        ...(group.title
          ? [
              {
                type: 'paragraph',
                data: { hProperties: { className: ['ui-markdown-toc__group-title'] } },
                children: [{ type: 'strong', children: [text(group.title)] }]
              } satisfies Paragraph
            ]
          : []),
        tocRootList(buildTocItems(items, 0, 1).items)
      ]
    });
  });
  const nodes: BlockContent[] = [
    tocTitle(),
    ...(intro.length ? [tocRootList(buildTocItems(intro, 0, 1).items)] : []),
    ...(groups.length
      ? [
          {
            type: 'blockquote' as const,
            data: {
              tocContainer: true,
              hName: 'div',
              hProperties: { className: ['ui-markdown-toc__groups'] }
            },
            children: groups
          }
        ]
      : []),
    tocSeparator()
  ];
  return [
    {
      type: 'blockquote',
      data: {
        tocContainer: true,
        hName: 'nav',
        hProperties: {
          className: ['ui-markdown-toc', ...(groups.length ? ['ui-markdown-toc--grouped'] : [])],
          ariaLabel: TOC_TITLE
        }
      },
      children: [
        {
          type: 'blockquote',
          data: {
            tocContainer: true,
            hName: 'div',
            hProperties: { className: ['ui-markdown-toc__inner'] }
          },
          children: nodes
        }
      ]
    }
  ];
};

export const expandTableOfContents = (
  document: Root,
  authoredIds?: ReadonlyMap<Heading, string>
): Root => {
  const entries = collectTocEntries(document, authoredIds);

  return {
    ...document,
    children: document.children.flatMap((node) =>
      node.type === 'leafDirective' ? [] : isTocPlaceholder(node) ? buildTocNodes(entries) : [node]
    )
  };
};
