import { describe, expect, it } from 'vitest';

import {
  createMarkdownDocument,
  parseMarkdownFragment,
  render,
  serializeMarkdownDocument,
  tablesToLists
} from './index';

const table =
  '| № | Работа | Частота |\n| - | - | - |\n| 4 | **Ремонт** [дороги](/road/) | `по запросу` |\n| 9 | | Ежедневно |';

describe('Markdown tables', () => {
  it('requires an HTML opt-in and never allows raw HTML through it', () => {
    expect(() => render(table)).toThrow('Markdown tables are not supported; use lists.');
    const html = render(`${table}\n\n<script>alert(1)</script>`, { allowTables: true });
    expect(html).toContain('<th scope="col">');
    expect(html).toContain('<td>4</td>');
    expect(html).not.toContain('<script>');
  });

  it('preserves labels, explicit numbers, inline nodes and empty cells in lists', () => {
    const children = tablesToLists(parseMarkdownFragment(table));
    const markdown = serializeMarkdownDocument(createMarkdownDocument({ children }));
    expect(markdown).toMatchInlineSnapshot(`
      "- №: 4

        Работа: **Ремонт** [дороги](/road/)

        Частота: \`по запросу\`
      - №: 9

        Работа:

        Частота: Ежедневно
      "
    `);
    expect(() =>
      serializeMarkdownDocument(createMarkdownDocument({ children: parseMarkdownFragment(table) }))
    ).toThrow('Markdown tables are not supported; use lists.');
  });

  it('converts tables inside quotes and preserves a header-only table', () => {
    const markdown =
      '> | Name | Value |\n> | - | - |\n> | A | B |\n\n| Empty | Header |\n| - | - |';
    const children = tablesToLists(parseMarkdownFragment(markdown));
    expect(serializeMarkdownDocument(createMarkdownDocument({ children }))).toMatchInlineSnapshot(`
      "> - Name: A
      >
      >   Value: B

      - Empty

        Header
      "
    `);
  });
});
