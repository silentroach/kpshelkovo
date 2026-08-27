import { describe, expect, it } from 'vitest';

import { preprocessSiteMarkdown, renderMarkdown } from '../render';

const visibleHtml = (html: string): string => html.replaceAll('\u00A0', '·');

const pipelineSnapshot = (input: string) => ({
  input,
  preprocessed: preprocessSiteMarkdown(input).markdown,
  html: visibleHtml(renderMarkdown(input)),
});

describe('markdown pipeline snapshots', () => {
  it('keeps a following legal clause outside the last list item', () => {
    const html = renderMarkdown(`1.1. Стороны исходят из предпосылок:

- Клиент приобрел участок;
- Обслуживающая компания заключает договоры.

  1.2. Следующий пункт должен вернуться на основной отступ.`);

    expect(html).not.toMatch(/<li>[\s\S]*1\.2\.[\s\S]*<\/li>/);
    expect(html).toContain(
      '</ul>\n<p>1.2. Следующий пункт должен вернуться на\u00A0основной отступ.</p>',
    );
  });

  it('shows how OCR-like contract lists become rendered HTML', () => {
    expect([
      pipelineSnapshot(`Тарифы:

- 1. Погрузчик — по запросу.
- 2. Самосвал — по запросу.`),
      pipelineSnapshot(`\`\`\`txt
- 1. Это пример, а не список.
  1.2. Это пример, а не пункт договора.
\`\`\``),
    ]).toMatchInlineSnapshot(`
      [
        {
          "html": "<p>Тарифы:</p>
      <ol>
      <li>Погрузчик·— по·запросу.</li>
      <li>Самосвал·— по·запросу.</li>
      </ol>",
          "input": "Тарифы:

      - 1. Погрузчик — по запросу.
      - 2. Самосвал — по запросу.",
          "preprocessed": "Тарифы:

      1. Погрузчик — по запросу.
      2. Самосвал — по запросу.",
        },
        {
          "html": "<pre><code class="language-txt">- 1. Это пример, а не список.
        1.2. Это пример, а не пункт договора.
      </code></pre>",
          "input": "\`\`\`txt
      - 1. Это пример, а не список.
        1.2. Это пример, а не пункт договора.
      \`\`\`",
          "preprocessed": "\`\`\`txt
      - 1. Это пример, а не список.
        1.2. Это пример, а не пункт договора.
      \`\`\`",
        },
      ]
    `);
  });
});
