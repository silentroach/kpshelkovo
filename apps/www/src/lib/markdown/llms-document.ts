import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  type MarkdownListItemInput
} from '@shelkovo/markdown';

import type {
  LlmsDocument,
  LlmsSection,
  MarkdownListItem,
  MarkdownNode
} from './llms-document.types';

export const serializeMarkdownNodes = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

export const markdownBlocks = (markdown: string): readonly MarkdownNode[] =>
  parseMarkdownFragment(markdown);

export const markdownListItem = (value: string): MarkdownListItem =>
  md.listItem(parseMarkdownFragment(value) as MarkdownListItemInput);

export const markdownList = (items: readonly (MarkdownListItem | string)[]): MarkdownNode =>
  md.list(items.map((item) => (typeof item === 'string' ? markdownListItem(item) : item)));

export const llmsSection = (title: string, children: readonly MarkdownNode[]): LlmsSection => ({
  title,
  children
});

export const serializeLlmsDocument = ({
  title,
  summary,
  introduction = [],
  sections
}: LlmsDocument): string =>
  serializeMarkdownNodes([
    md.heading(1, title),
    md.blockquote([md.paragraph(summary)]),
    ...introduction,
    ...sections.flatMap((section) => [md.heading(2, section.title), ...section.children])
  ]);

const LINE_BREAK = '\n';
const HEADING = /^#{1,6} /u;

const parseBlock = (lines: readonly string[]): readonly MarkdownNode[] =>
  lines.length > 0 ? parseMarkdownFragment(lines.join(LINE_BREAK)) : [];

export const serializeMarkdownLineDocument = (
  lines: readonly string[],
  sectionTitles: ReadonlySet<string>
): string => {
  const children: MarkdownNode[] = [];
  let blockLines: string[] = [];

  const flushBlock = () => {
    children.push(...parseBlock(blockLines));
    blockLines = [];
  };

  lines.forEach((line, index) => {
    if (HEADING.test(line)) {
      flushBlock();
      children.push(...parseMarkdownFragment(line));
      return;
    }

    if (index === 0 || sectionTitles.has(line)) {
      flushBlock();
      children.push(md.heading(index === 0 ? 1 : 2, line));
      return;
    }

    blockLines.push(line);
  });

  flushBlock();

  return serializeMarkdownNodes(children);
};
