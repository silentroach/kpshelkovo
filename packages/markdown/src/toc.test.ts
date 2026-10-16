// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import {
  createMarkdownDocument,
  extractMarkdownText,
  parseMarkdownFragment,
  render,
  serializeMarkdownDocument
} from './index';

const companion = (source: string): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children: parseMarkdownFragment(source) }));

const navigation = (
  source: string
): readonly (readonly [string | undefined, string | undefined])[] => {
  document.body.innerHTML = render(source);
  return [...document.querySelectorAll('nav a')].map(
    (link) =>
      [link.textContent?.replaceAll('\u00a0', ' '), link.getAttribute('href') ?? undefined] as const
  );
};

describe('authored TOC annotations', () => {
  const source =
    '[TOC]\n\n# Document\n\n## Introduction\n\n### Details\n\n::toc-group[Main]\n\n## 3. Terms\n\n### 3.2 Detail\n\n::toc-group[Attachments]\n\n## :toc-omit[Attachment A:] 1. Services\n\n## :toc-omit[Attachment B:] 1. Services\n\n## :toc-omit[Attachment B:] 1. Services';

  it('keeps entire branches, authored numbers, full unique IDs and shortened labels', () => {
    expect(navigation(source)).toMatchInlineSnapshot(`
      [
        [
          "Introduction",
          "#introduction",
        ],
        [
          "Details",
          "#details",
        ],
        [
          "3. Terms",
          "#3-terms",
        ],
        [
          "3.2 Detail",
          "#3-2-detail",
        ],
        [
          "1. Services",
          "#attachment-a-1-services",
        ],
        [
          "1. Services",
          "#attachment-b-1-services",
        ],
        [
          "1. Services",
          "#attachment-b-1-services-2",
        ],
      ]
    `);
    expect(
      [...document.querySelectorAll('.ui-markdown-toc__group-title')].map(
        (node) => node.textContent
      )
    ).toMatchInlineSnapshot(`
      [
        "Main",
        "Attachments",
      ]
    `);
    expect(
      document.querySelector('.ui-markdown-toc__inner > ul > li > ul a')?.getAttribute('href')
    ).toBe('#details');
    expect(document.getElementById('attachment-b-1-services-2')?.getAttribute('aria-label')).toBe(
      'Attachment B: 1. Services'
    );
  });

  it('emits ordinary Markdown and preserves repeated preparation', () => {
    const result = companion(source);
    expect(result).toMatchInlineSnapshot(`
      "**Содержание**

      - [Introduction](#introduction)
        - [Details](#details)

      **Main**

      - [3. Terms](#3-terms)
        - [3.2 Detail](#3-2-detail)

      **Attachments**

      - [1. Services](#attachment-a-1-services)
      - [1. Services](#attachment-b-1-services)
      - [1. Services](#attachment-b-1-services-2)

      ---

      # Document

      ## Introduction

      ### Details

      ## 3. Terms

      ### 3.2 Detail

      ## Attachment A: 1. Services

      ## Attachment B: 1. Services

      ## Attachment B: 1. Services
      "
    `);
    expect(companion(result)).toBe(result);
    const ast = createMarkdownDocument({ children: parseMarkdownFragment(source) });
    expect(serializeMarkdownDocument(ast)).toBe(serializeMarkdownDocument(ast));
    expect(navigation(result)).toHaveLength(0);
    expect(extractMarkdownText(source)).not.toMatch(/toc-(?:group|omit)|Attachments|Main/u);
    expect(extractMarkdownText(source)).toContain('Attachment B: 1. Services');
  });

  it.each([0, 1, 3])('handles %i groups and skips empty groups', (count) => {
    const input = `[TOC]\n\n${Array.from({ length: count }, (_, index) => `::toc-group[Group ${index}]\n\n## ${index}. Heading\n\n### Child ${index}`).join('\n\n')}\n\n::toc-group[Empty]`;
    expect(navigation(input)).toHaveLength(count * 2);
    expect(document.querySelectorAll('.ui-markdown-toc__group')).toHaveLength(count);
  });

  it('does not change full heading IDs when annotations are added', () => {
    const annotated = navigation('[TOC]\n\n## **:toc-omit[Attachment:]** 5. Terms');
    const original = navigation('[TOC]\n\n## **Attachment:** 5. Terms');
    expect(annotated[0]?.[1]).toBe(original[0]?.[1]);
    expect(annotated[0]?.[0]).toBe('5. Terms');
  });

  it('supports multiple middle omissions and repeated group names without merging groups', () => {
    expect(
      navigation(
        '[TOC]\n\n::toc-group[Same]\n\n## 7. :toc-omit[Full] Title :toc-omit[Suffix]\n\n::toc-group[Same]\n\n## 9. Last'
      )
    ).toMatchInlineSnapshot(`
      [
        [
          "7.  Title",
          "#7-full-title-suffix",
        ],
        [
          "9. Last",
          "#9-last",
        ],
      ]
    `);
    expect(document.querySelectorAll('.ui-markdown-toc__group')).toHaveLength(2);
  });

  it('strips annotations even without a TOC and leaves ordinary empty headings alone', () => {
    expect(companion('::toc-group[Group]\n\n## :toc-omit[Full] Title')).toMatchInlineSnapshot(`
      "## Full Title
      "
    `);
    expect(() => render('##')).not.toThrow();
    expect(() => companion('##')).not.toThrow();
  });

  it.each([
    '::toc-group[]\n\n## Heading',
    '::toc-group[Name]{#id}\n\n## Heading',
    '## :toc-omit[Everything]',
    '## **:toc-omit[Everything]**',
    '## Parent\n\n::toc-group[Split]\n\n### Child',
    '> ::toc-group[Nested]',
    'Outside :toc-omit[Heading]',
    ':toc-group[Inline]',
    '::toc-omit[Leaf]',
    ':::toc-group[Container]\nText\n:::',
    '## :toc-omit[Unclosed',
    '::toc-group[Unclosed'
  ])('rejects invalid annotations with source location: %s', (input) => {
    expect(() => render(input)).toThrow(/TOC annotation at \d+:\d+:/u);
    expect(() => companion(input)).toThrow(/TOC annotation at \d+:\d+:/u);
    expect(() => extractMarkdownText(input)).toThrow(/TOC annotation at \d+:\d+:/u);
  });

  it('leaves unknown directives, cases, colons and literal syntax intact', () => {
    const input =
      ':unknown[**label**]{#id} @slug:gen 12:30\n\n::unknown[label]\n\n:::unknown\nordinary\n:::\n\n`:toc-omit[Code]`\n\n```md\n::toc-group[Code]\n```\n\n\\:toc-omit[literal]';
    expect(extractMarkdownText(input)).toMatchInlineSnapshot(
      `":unknown[label]{#id} @slug:gen 12:30 ::unknown[label] :::unknown ordinary ::: :toc-omit[Code] :toc-omit[literal]"`
    );
    expect(companion(companion(input))).toBe(companion(input));
    expect(render(input)).toContain('<strong>label</strong>');
    expect(render(input)).not.toContain('<nav');
  });
});
