// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '../../people/mentions';
import { renderMarkdown, renderMarkdownWithMetadata } from '../render';

describe('site Markdown ID prefix', () => {
  it('keeps app processing and metadata consistent for independently rendered bodies', () => {
    const markdown = `[TOC]

## Раздел

@kschemelinin [Локально](#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB) [Контейнер](#offer-other).

Текст[^note].

[^note]: Сноска.
`;
    const mentions = {
      registry: new Map([
        ['kschemelinin', createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин')]
      ]),
      context: 'inventory test'
    };
    document.body.innerHTML = ['first', 'second']
      .map((id) => {
        const options = { idPrefix: `offer-${id}-body-`, mentions };
        const rendered = renderMarkdownWithMetadata(markdown, options);
        expect(renderMarkdown(markdown, options)).toBe(rendered.html);
        expect(rendered.localIds.get('раздел')).toBe(`offer-${id}-body-раздел`);
        return `<section data-body="${id}">${rendered.html}</section>`;
      })
      .join('');

    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const body of document.querySelectorAll('section[data-body]')) {
      for (const link of body.querySelectorAll('a[href^="#"]')) {
        const href = link.getAttribute('href')!;
        if (href === '#offer-other') {
          continue;
        }
        expect(body.contains(document.getElementById(decodeURIComponent(href.slice(1))))).toBe(
          true
        );
      }
      expect(body.querySelector('a[href="/people/kschemelinin/"]')?.textContent).toBe(
        'Кирилл Щемелинин'
      );
    }
  });

  it('does not change unscoped output and keeps file-link processing', () => {
    const markdown = '## Section\n\n[Document](/document.pdf)';
    const unscoped = renderMarkdownWithMetadata(markdown);
    const scoped = renderMarkdownWithMetadata(markdown, { idPrefix: 'body-' });
    expect(renderMarkdown(markdown, { idPrefix: '' })).toBe(unscoped.html);
    expect(unscoped.localIds.get('section')).toBe('section');
    expect(scoped.html).toContain('href="/document.pdf"');
    expect(scoped.html.replaceAll('body-section', 'section')).toBe(unscoped.html);
  });
});
