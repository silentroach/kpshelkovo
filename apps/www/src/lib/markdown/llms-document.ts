import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  type MarkdownPhrasingInput
} from '@shelkovo/markdown';

import type {
  LlmsDocument,
  LlmsSection,
  MarkdownListItem,
  MarkdownNode
} from './llms-document.types';

export const serializeMarkdownNodes = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

export const markdownLinkItem = (
  label: string,
  url: string,
  description?: MarkdownPhrasingInput
): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(url, label),
      ...(description
        ? [
            md.text(': '),
            ...(typeof description === 'string' ? [md.text(description)] : description)
          ]
        : [])
    ])
  ]);

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
