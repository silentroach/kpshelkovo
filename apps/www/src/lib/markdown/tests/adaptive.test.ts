import {
  parseMarkdownFragment,
  createMarkdownDocument,
  serializeMarkdownDocument
} from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { extractFirstKbText } from '@/lib/kb/text';

import { transformAdaptive } from '../adaptive';
import { renderMarkdown } from '../render';

const block = (wide: string, mobile: string): string =>
  `:::adaptive\n\n${wide}\n\n::mobile\n\n${mobile}\n\n:::`;

const mobileMarkdown = (source: string): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      children: transformAdaptive(parseMarkdownFragment(source), 'mobile', 'fixture')
    })
  );

describe('author-written adaptive Markdown', () => {
  it('leaves ordinary KB bodies unchanged when adaptive rendering is enabled', () => {
    const source = `[TOC]

## Раздел

> [!NOTE]
> Пояснение.

- Обычный список со [ссылкой][guide]

| Работа | Частота |
| --- | --- |
| Газ | По запросу |

[guide]: /kb/ok/`;
    expect(renderMarkdown(source, { allowTables: true, adaptive: true })).toBe(
      renderMarkdown(source, { allowTables: true })
    );
  });
  it('keeps explicit plain numbers and their frequencies together without a nested ordered list', () => {
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(
      block('Wide', '- 7\\. Вывоз ТБО\n\n  Периодичность: 3 раза в неделю'),
      { adaptive: true }
    );
    const mobile = document.querySelector('.ui-adaptive__mobile');
    expect({
      paragraphs: [...(mobile?.querySelectorAll('ul > li > p') ?? [])].map((node) =>
        node.textContent.replace(/\s+/gu, ' ')
      ),
      orderedLists: mobile?.querySelectorAll('ol').length
    }).toMatchInlineSnapshot(`
      {
        "orderedLists": 0,
        "paragraphs": [
          "7. Вывоз ТБО",
          "Периодичность: 3 раза в неделю",
        ],
      }
    `);
  });
  it('keeps whole-document references and inline formatting in the mobile projection', () => {
    expect(
      mobileMarkdown(
        `${block('Wide', '- **7. [Газ][gas]**\n\n  По запросу')}\n\n[gas]: /kb/services/gas/`
      )
    ).toMatchInlineSnapshot(`
        "- **7. [Газ](/kb/services/gas/)**

          По запросу
        "
      `);
  });

  it('groups multiple alternatives without duplicating common sections or indexing wide copies', () => {
    const source = `[TOC]\n\n## Общий раздел\n\n${block('| Работа |\n| --- |\n| Газ |', '- Газ')}\n\n${block('Второй широкий', 'Второй мобильный')}`;
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(source, { adaptive: true, allowTables: true });
    expect({
      sections: document.querySelectorAll('h2').length,
      groups: document.querySelectorAll('.ui-adaptive').length,
      tables: document.querySelectorAll('.ui-adaptive__wide table').length,
      ignored: [...document.querySelectorAll('[data-search-adaptive-copy]')].map((node) =>
        node.getAttribute('data-pagefind-ignore')
      ),
      indexedAlternatives: [...document.querySelectorAll('.ui-adaptive__mobile')].map((node) =>
        node.textContent.trim()
      ),
      markers: document.body.textContent.includes(':::')
    }).toMatchInlineSnapshot(`
      {
        "groups": 2,
        "ignored": [
          "all",
          "all",
        ],
        "indexedAlternatives": [
          "Газ",
          "Второй мобильный",
        ],
        "markers": false,
        "sections": 1,
        "tables": 1,
      }
    `);
  });

  it('leaves literal marker examples and unknown colon syntax alone', () => {
    const source = '`:::adaptive`\n\n```md\n:::adaptive\n::mobile\n:::\n```\n\n::unknown';
    expect(mobileMarkdown(source)).toContain('```md\n:::adaptive\n::mobile\n:::\n```');
    expect(renderMarkdown(source, { adaptive: true })).not.toContain('ui-adaptive');
  });

  it('does not turn a plain callout marker into a quotation just by grouping a view', () => {
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(
      block('[!NOTE]\n\nPlain paragraph', '> [!NOTE]\n> Quotation'),
      {
        adaptive: true
      }
    );
    expect({
      wideCallouts: document.querySelectorAll('.ui-adaptive__wide aside').length,
      mobileCallouts: document.querySelectorAll('.ui-adaptive__mobile aside').length
    }).toMatchInlineSnapshot(`
      {
        "mobileCallouts": 1,
        "wideCallouts": 0,
      }
    `);
  });

  it.each([
    ':::adaptive\n\nWide',
    ':::adaptive\n\n::mobile\n\nMobile\n\n:::',
    ':::adaptive\n\nWide\n\n:::',
    ':::adaptive\n\nWide\n\n::mobile\n\nMobile\n\n::mobile\n\n:::',
    ':::adaptive\n\n:::adaptive\n\nWide\n\n::mobile\n\nMobile\n\n:::',
    ':::adaptive\nWide\n\n::mobile\n\nMobile\n\n:::',
    ':::adaptive\n\n| A |\n| - |\n| B |\n::mobile\n\nMobile\n\n:::',
    ':::adaptive\n\nWide\n\n::mobile\n\n- Mobile\n  :::',
    block('## Hidden heading', 'Mobile')
  ])('rejects malformed boundaries with the source location: %s', (source) => {
    expect(() => transformAdaptive(parseMarkdownFragment(source), 'html', 'fixture')).toThrow(
      /fixture:\d+:\d+: adaptive:/u
    );
  });

  it('extracts the authored mobile text even without a callout or SEO override', () => {
    expect(
      extractFirstKbText(
        block(
          'Неподходящий широкий текст',
          'Мобильный текст для описания справки без служебных маркеров.'
        )
      )
    ).toBe('Мобильный текст для описания справки без служебных маркеров.');
  });
});
