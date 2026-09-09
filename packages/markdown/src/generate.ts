import type {
  BlockContent,
  Code,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Text,
  ThematicBreak,
  Yaml
} from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown } from 'mdast-util-to-markdown';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';
import { stringify } from 'yaml';

import type {
  MarkdownDocumentInput,
  MarkdownFrontmatter,
  MarkdownListItemInput,
  MarkdownListItemOptions,
  MarkdownListOptions,
  MarkdownPhrasingInput
} from './generate-types';
import { assertNoMarkdownTables } from './no-tables';
import { expandTableOfContents } from './toc';

const createParseExtensions = () => [gfm(), frontmatter(['yaml'])];

const createMdastExtensions = () => [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])];

const createSerializeExtensions = () => [gfmToMarkdown(), frontmatterToMarkdown(['yaml'])];

const toPhrasingChildren = (input: MarkdownPhrasingInput): PhrasingContent[] =>
  typeof input === 'string' ? [md.text(input)] : [...input];

const toListItemChildren = (input: MarkdownListItemInput): BlockContent[] =>
  typeof input === 'string' ? [md.paragraph(input)] : [...input];

const serializeFrontmatter = (frontmatter: MarkdownFrontmatter): string =>
  stringify(frontmatter, {
    collectionStyle: 'block',
    directives: false,
    indent: 2,
    lineWidth: 0
  }).trimEnd();

export const createMarkdownDocument = ({ frontmatter, children }: MarkdownDocumentInput): Root => ({
  type: 'root',
  children: [...(frontmatter ? [md.yaml(serializeFrontmatter(frontmatter))] : []), ...children]
});

export const serializeMarkdownDocument = (document: Root): string => {
  const expandedDocument = expandTableOfContents(document);
  assertNoMarkdownTables(expandedDocument);

  const markdown = toMarkdown(expandedDocument, {
    bullet: '-',
    bulletOrdered: '.',
    closeAtx: false,
    extensions: createSerializeExtensions(),
    fences: true,
    incrementListMarker: false,
    listItemIndent: 'one',
    rule: '-',
    setext: false
  });

  return markdown.endsWith('\n') ? markdown : `${markdown}\n`;
};

export const parseMarkdownFragment = (markdown: string): readonly RootContent[] =>
  fromMarkdown(markdown, {
    extensions: createParseExtensions(),
    mdastExtensions: createMdastExtensions()
  }).children.filter((node) => node.type !== 'yaml');

export const md = {
  blockquote: (children: readonly BlockContent[]): RootContent => ({
    type: 'blockquote',
    children: [...children]
  }),
  code: (value: string, lang?: string, meta?: string): Code => ({
    type: 'code',
    value,
    ...(lang ? { lang } : {}),
    ...(meta ? { meta } : {})
  }),
  heading: (depth: Heading['depth'], children: MarkdownPhrasingInput): Heading => ({
    type: 'heading',
    depth,
    children: toPhrasingChildren(children)
  }),
  inlineCode: (value: string): InlineCode => ({ type: 'inlineCode', value }),
  link: (url: string, children: MarkdownPhrasingInput, title?: string): Link => ({
    type: 'link',
    url,
    children: toPhrasingChildren(children),
    ...(title ? { title } : {})
  }),
  list: (children: readonly ListItem[], options: MarkdownListOptions = {}): List => ({
    type: 'list',
    children: [...children],
    ...(options.ordered === undefined ? {} : { ordered: options.ordered }),
    spread: options.spread ?? false,
    ...(options.start === undefined ? {} : { start: options.start })
  }),
  listItem: (input: MarkdownListItemInput, options: MarkdownListItemOptions = {}): ListItem => ({
    type: 'listItem',
    children: toListItemChildren(input),
    ...(options.checked === undefined ? {} : { checked: options.checked }),
    spread: options.spread ?? false
  }),
  paragraph: (children: MarkdownPhrasingInput): Paragraph => ({
    type: 'paragraph',
    children: toPhrasingChildren(children)
  }),
  text: (value: string): Text => ({ type: 'text', value }),
  thematicBreak: (): ThematicBreak => ({ type: 'thematicBreak' }),
  yaml: (value: string): Yaml => ({ type: 'yaml', value })
} as const;
