import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';
import { describe, expect, it } from 'vitest';

import { preprocessSiteMarkdownContent, renderMarkdown } from '@/lib/markdown/render';
import { createPersonMentionTarget } from '@/lib/people/mentions';

describe('editorial marker in site Markdown', () => {
  it('keeps a marked paragraph in a warning separate from the warning title', () => {
    expect(renderMarkdown('> [!WARNING]\n>\n> ==Срок меняется.==')).toMatchInlineSnapshot(`
      "<aside class="ui-callout ui-callout--warning">
      <p class="ui-callout__title"><strong>Внимание</strong></p>
      <p><mark class="ui-editorial-marker">Срок меняется.</mark></p>
      </aside>"
    `);
  });

  it('preserves a mention at the end of a marked phrase in HTML and public Markdown', () => {
    const slug = 'kschemelinin';
    const registry = new Map([[slug, createPersonMentionTarget(slug, 'Кирилл Щемелинин')]]);
    const { markdown } = preprocessSiteMarkdownContent(
      'Ответит ==наш сосед @kschemelinin==.',
      'editorial marker test',
      registry
    );

    expect(renderMarkdown(markdown)).toMatchInlineSnapshot(
      `"<p>Ответит <mark class="ui-editorial-marker">наш сосед <a href="/people/kschemelinin/">Кирилл Щемелинин</a></mark>.</p>"`
    );
    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({ children: parseMarkdownFragment(markdown) })
      )
    ).toBe('Ответит **наш сосед [Кирилл Щемелинин](/people/kschemelinin/)**.\n');
  });
});
