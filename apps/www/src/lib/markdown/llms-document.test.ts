import { describe, expect, it } from 'vitest';

import { llmsSection, markdownList, serializeLlmsDocument } from './llms-document';

describe('serializeLlmsDocument', () => {
  it('собирает llms-документы через mdast и сохраняет inline Markdown', () => {
    expect(
      serializeLlmsDocument({
        title: 'Текстовая карта раздела',
        summary: 'Путеводитель по данным раздела.',
        sections: [
          llmsSection('Главные URL', [
            markdownList([
              '[Главная](https://example.test/)',
              '[Лента](https://example.test/feed.json): данные в `json`'
            ])
          ])
        ]
      })
    ).toMatchInlineSnapshot(`
      "# Текстовая карта раздела

      > Путеводитель по данным раздела.

      ## Главные URL

      - [Главная](https://example.test/)
      - [Лента](https://example.test/feed.json): данные в \`json\`
      "
    `);
  });
});
