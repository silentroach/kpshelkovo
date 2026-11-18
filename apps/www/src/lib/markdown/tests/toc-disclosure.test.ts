import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../render';

const input = `[TOC]

## Introduction

::toc-group[Contract]

## 1. Terms

### Conditions

::toc-group[Appendices]

## :toc-omit[Appendix] 1. Services

[Original](https://example.com/original.pdf)`;

describe('KB contents disclosure', () => {
  it('wraps one generated TOC without changing links, headings or document content', () => {
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(input);
    const links = [...document.querySelectorAll('nav a')].map((link) => [
      link.textContent,
      link.getAttribute('href')
    ]);
    const headings = [...document.querySelectorAll('h2, h3')].map((heading) => heading.outerHTML);
    const groups = [...document.querySelectorAll('.ui-markdown-toc__group-title')].map(
      (node) => node.textContent
    );
    expect(document.querySelector('details')).toBeNull();

    document.body.innerHTML = renderMarkdown(input, { tocDisclosure: true });
    expect(
      [...document.querySelectorAll('nav a')].map((link) => [
        link.textContent,
        link.getAttribute('href')
      ])
    ).toEqual(links);
    expect([...document.querySelectorAll('h2, h3')].map((heading) => heading.outerHTML)).toEqual(
      headings
    );
    expect(
      [...document.querySelectorAll('.ui-markdown-toc__group-title')].map(
        (node) => node.textContent
      )
    ).toEqual(groups);
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect({
      navigation: document.querySelectorAll('nav').length,
      disclosure: document.querySelectorAll('nav details').length,
      summary: document.querySelectorAll('nav details > summary').length,
      open: document.querySelector('details')?.hasAttribute('open'),
      original: document.querySelector('a[href="https://example.com/original.pdf"]')?.textContent
    }).toMatchInlineSnapshot(`
      {
        "disclosure": 1,
        "navigation": 1,
        "open": false,
        "original": "Original",
        "summary": 1,
      }
    `);
  });

  it.each(['## No placeholder', '[TOC]\n\nNo headings'])(
    'does not add an empty disclosure: %s',
    (markdown) => {
      expect(renderMarkdown(markdown, { tocDisclosure: true })).toBe(renderMarkdown(markdown));
    }
  );

  it('keeps the companion as a complete ordinary contents list', () => {
    const companion = serializeMarkdownDocument(
      createMarkdownDocument({
        children: parseMarkdownFragment(input)
      })
    );
    expect(companion).toContain('[Introduction](#introduction)');
    expect(companion).toContain('[1. Services](#appendix-1-services)');
    expect(companion).not.toContain('<details');
  });
});
