import { describe, expect, it } from 'vitest';

import { llmsSection, markdownList, serializeLlmsDocument } from './llms-document';

describe('serializeLlmsDocument', () => {
  it('собирает llms-документы через mdast и сохраняет inline Markdown', () => {
    expect(
      serializeLlmsDocument({
        title: 'Текстовая карта раздела',
        file: 'llms.txt',
        sections: [
          llmsSection('Главные URL', [
            markdownList([
              'Главная: https://example.test/',
              'Фид: https://example.test/feed.json с `json`'
            ])
          ])
        ]
      })
    ).toMatchInlineSnapshot(`
      "# Текстовая карта раздела

      Файл: llms.txt
      Язык: русский

      ## Главные URL

      - Главная: <https://example.test/>
      - Фид: <https://example.test/feed.json> с \`json\`
      "
    `);
  });
});
