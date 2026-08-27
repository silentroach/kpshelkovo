// @vitest-environment happy-dom

import { getAllByRole, getByRole } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';

import {
  createMarkdownDocument,
  extractFirstMarkdownText,
  extractMarkdownText,
  formatDynamicHtml,
  md,
  parseMarkdownFragment,
  rehypeTypograf,
  render,
  satteriTypograf,
  serializeMarkdownDocument,
} from './index';
import { headingSlug } from './heading-slugs';

const showNbsp = (value: string): string =>
  value.replaceAll('\u00A0', '·').replaceAll('\u202F', '·');

const renderDom = (markdown: string) => {
  document.body.innerHTML = render(markdown);

  return document;
};

describe('@shelkovo/markdown', () => {
  it('serializes YAML frontmatter without quoting every string', () => {
    const document = createMarkdownDocument({
      frontmatter: {
        title: 'Новости Шелково',
        draft: false,
        tags: ['новости', 'город'],
      },
      children: [md.heading(1, 'Заголовок')],
    });

    expect(serializeMarkdownDocument(document)).toMatchInlineSnapshot(`
      "---
      title: Новости Шелково
      draft: false
      tags:
        - новости
        - город
      ---

      # Заголовок
      "
    `);
  });

  it('serializes nested lists with package style markers', () => {
    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [
            md.list([
              md.listItem([
                md.paragraph('Первый'),
                md.list([md.listItem('Вложенный'), md.listItem('Еще один')]),
              ]),
              md.listItem('Второй'),
            ]),
            md.list(
              [md.listItem('Один'), md.listItem('Два'), md.listItem('Три')],
              { ordered: true },
            ),
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "- Первый
        - Вложенный
        - Еще один
      - Второй

      1. Один
      1. Два
      1. Три
      "
    `);
  });

  it('rejects table nodes in generated Markdown documents', () => {
    expect(() =>
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [{ type: 'table', children: [] }],
        }),
      ),
    ).toThrow('Markdown tables are not supported; use lists.');
  });

  it('parses Markdown fragments for insertion into generated documents', () => {
    const fragment = parseMarkdownFragment(
      'Авторский **текст** с [ссылкой](https://example.com).',
    );

    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [md.heading(2, 'Фрагмент'), ...fragment],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "## Фрагмент

      Авторский **текст** с [ссылкой](https://example.com).
      "
    `);
  });

  it('expands [TOC] when serializing generated Markdown documents', () => {
    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [
            md.heading(1, 'Главная страница'),
            md.paragraph('[TOC]'),
            md.heading(2, 'Что сделать сразу'),
            md.heading(3, 'Документы и ссылки'),
            md.heading(2, 'Что сделать сразу'),
            md.heading(3, [md.inlineCode('index.md')]),
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "# Главная страница

      **Содержание**

      - [Что сделать сразу](#что-сделать-сразу)
        - [Документы и ссылки](#документы-и-ссылки)
      - [Что сделать сразу](#что-сделать-сразу-2)
        - [index.md](#index-md)

      ---

      ## Что сделать сразу

      ### Документы и ссылки

      ## Что сделать сразу

      ### \`index.md\`
      "
    `);
  });

  it('escapes unsafe Markdown characters when serializing text nodes', () => {
    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [md.paragraph('- пункт\n![alt](bad)')],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "\\- пункт
      !\\[alt]\\(bad)
      "
    `);
  });

  it('formats dynamic HTML with project typography rules', () => {
    expect(formatDynamicHtml('Шелково Ривер')).toBe('Шелково\u00A0Ривер');
    expect(formatDynamicHtml('<p>Шелково Парк</p>')).toBe(
      '<p>Шелково\u00A0Парк</p>',
    );
    expect(formatDynamicHtml('Новости Шелково')).toBe('Новости Шелково');
  });

  it('keeps a word before a number sign and its number on the same line', () => {
    expect(
      showNbsp(formatDynamicHtml('в Приложении №1')),
    ).toMatchInlineSnapshot(`"в·Приложении·№·1"`);
    expect(showNbsp(formatDynamicHtml('п. № 1'))).toMatchInlineSnapshot(
      `"п.·№·1"`,
    );
  });

  it('formats Satteri HTML text with project typography rules', async () => {
    const result = await markdownToHtml('Шелково Ривер и `Шелково Парк`', {
      hastPlugins: [satteriTypograf()],
    });

    expect(showNbsp(result.html)).toMatchInlineSnapshot(`
      "<p>Шелково·Ривер и <code>Шелково Парк</code></p>
      "
    `);
  });

  it('preserves text edges with a long whitespace prefix', () => {
    const value = `${' '.repeat(50_000)}Текст\t\n`;
    const textNode = { type: 'text', value };

    rehypeTypograf()({ type: 'root', children: [textNode] });

    expect(textNode.value).toBe(value);
  });

  it('renders markdown and drops raw HTML', () => {
    expect(render('Текст **важный**\n\n<script>alert(1)</script>'))
      .toMatchInlineSnapshot(`
        "<p>Текст <strong>важный</strong></p>"
      `);
  });

  it('renders a standalone image title as its visible caption', () => {
    expect(
      showNbsp(
        render(`![Карта](https://example.com/map.png "Скриншот от 14 августа 2026 года.")

Текст с ![иконкой](https://example.com/icon.png "Подсказка").

![Изображение без подписи](https://example.com/photo.png)`),
      ),
    ).toMatchInlineSnapshot(`
      "<figure class="ui-markdown-figure"><img src="https://example.com/map.png" alt="Карта"><figcaption class="ui-media-caption">Скриншот от·14·августа 2026 года.</figcaption></figure>
      <p>Текст с <img src="https://example.com/icon.png" alt="иконкой" title="Подсказка">.</p>
      <p><img src="https://example.com/photo.png" alt="Изображение без подписи"></p>"
    `);
  });

  it('preserves the visible caption when a standalone image is linked', () => {
    expect(
      showNbsp(
        render(
          '[![Карта](https://example.com/map.png "Схема поселка.")](https://example.com/map.png)',
        ),
      ),
    ).toMatchInlineSnapshot(`
      "<figure class="ui-markdown-figure"><a href="https://example.com/map.png"><img src="https://example.com/map.png" alt="Карта"></a><figcaption class="ui-media-caption">Схема поселка.</figcaption></figure>"
    `);
  });

  it('adds stable heading ids for in-page links', () => {
    expect(render('## Что сделать сразу\n\nТекст\n\n## Что сделать сразу'))
      .toMatchInlineSnapshot(`
        "<h2 id="что-сделать-сразу" aria-label="Что сделать сразу">Что сделать сразу<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#что-сделать-сразу" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>
        <p>Текст</p>
        <h2 id="что-сделать-сразу-2" aria-label="Что сделать сразу">Что сделать сразу<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#что-сделать-сразу-2" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>"
    `);
  });

  it('creates a heading slug from a long separator run', () => {
    expect(headingSlug(`${'-'.repeat(50_000)}Раздел`)).toBe('раздел');
  });

  it('expands [TOC] before rendering Markdown to HTML', () => {
    expect(render('[TOC]\n\n## Раздел\n\n### Детали\n\n## Раздел'))
      .toMatchInlineSnapshot(`
        "<p class="ui-markdown-toc__title"><strong>Содержание</strong></p>
        <ul class="ui-markdown-toc__list">
        <li><a href="#раздел">Раздел</a>
        <ul>
        <li><a href="#детали">Детали</a></li>
        </ul>
        </li>
        <li><a href="#раздел-2">Раздел</a></li>
        </ul>
        <hr>
        <h2 id="раздел" aria-label="Раздел">Раздел<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#раздел" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>
        <h3 id="детали" aria-label="Детали">Детали<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#детали" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h3>
        <h2 id="раздел-2" aria-label="Раздел">Раздел<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#раздел-2" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>"
      `);
  });

  it('rejects tables when rendering Markdown strings', () => {
    expect(() =>
      render('| Ключ | Значение |\n| --- | --- |\n| A | B |'),
    ).toThrow('Markdown tables are not supported; use lists.');
  });

  it('links task list checkboxes to their item text via aria-labelledby', () => {
    const document = renderDom('- [x] First task\n- [ ] Second task');
    const checkboxes = getAllByRole(document.body, 'checkbox');
    const first = getByRole(document.body, 'checkbox', {
      name: 'First task',
    }) as HTMLInputElement;
    const second = getByRole(document.body, 'checkbox', {
      name: 'Second task',
    }) as HTMLInputElement;

    expect({
      count: checkboxes.length,
      distinctLabels:
        first.getAttribute('aria-labelledby') !==
        second.getAttribute('aria-labelledby'),
      first: { checked: first.checked, disabled: first.disabled },
      second: { checked: second.checked, disabled: second.disabled },
    }).toMatchInlineSnapshot(`
      {
        "count": 2,
        "distinctLabels": true,
        "first": {
          "checked": true,
          "disabled": true,
        },
        "second": {
          "checked": false,
          "disabled": true,
        },
      }
    `);
  });

  it('gives nested task checkboxes only their own item names', () => {
    const document = renderDom(`- [ ] Parent task
  - [x] Child task
    1. [ ] Grandchild task`);
    const checkboxes = getAllByRole(document.body, 'checkbox');
    const labels = Array.from(
      document.querySelectorAll('li.task-list-item > span[id]'),
    );

    expect(getByRole(document.body, 'checkbox', { name: 'Parent task' })).toBe(
      checkboxes[0],
    );
    expect(getByRole(document.body, 'checkbox', { name: 'Child task' })).toBe(
      checkboxes[1],
    );
    expect(
      getByRole(document.body, 'checkbox', { name: 'Grandchild task' }),
    ).toBe(checkboxes[2]);
    expect(labels).toHaveLength(3);
    expect(labels.every((label) => !label.querySelector('ul, ol'))).toBe(true);
    expect(labels.slice(0, 2).map((label) => label.nextElementSibling?.tagName))
      .toMatchInlineSnapshot(`
      [
        "UL",
        "OL",
      ]
    `);
  });

  it('preserves links and formatting in nested task labels', () => {
    const document =
      renderDom(`- [ ] **Parent** with [guide](https://example.com/guide)
  - [x] _Child_ with \`code\``);
    const parentCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Parent with guide',
    });
    const childCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Child with code',
    });
    const parentLabel = document.getElementById(
      parentCheckbox.getAttribute('aria-labelledby') ?? '',
    );
    const childLabel = document.getElementById(
      childCheckbox.getAttribute('aria-labelledby') ?? '',
    );

    if (!parentLabel || !childLabel) {
      throw new Error('task checkbox label not found');
    }

    expect({
      childCode: childLabel.querySelector('code')?.textContent,
      childEmphasis: childLabel.querySelector('em')?.textContent,
      parentLink: parentLabel.querySelector('a')?.getAttribute('href'),
      parentStrong: parentLabel.querySelector('strong')?.textContent,
    }).toMatchInlineSnapshot(`
      {
        "childCode": "code",
        "childEmphasis": "Child",
        "parentLink": "https://example.com/guide",
        "parentStrong": "Parent",
      }
    `);
  });

  it('preprocesses markdown before rendering', () => {
    expect(
      render('Привет, @person', {
        preprocess: (markdown) =>
          markdown.replace('@person', '[Анна](/people/anna/)'),
      }),
    ).toBe('<p>Привет, <a href="/people/anna/">Анна</a></p>');
  });

  it('extracts first readable markdown text', () => {
    expect(
      extractFirstMarkdownText(`
\`\`\`ts
const value = 1
\`\`\`

![Река](river.jpg)

Первый **абзац** с [ссылкой](https://example.com).
`),
    ).toBe('Река');

    expect(
      extractFirstMarkdownText('```ts\nconst value = 1\n```'),
    ).toBeUndefined();
  });

  it('extracts all readable markdown text', () => {
    expect(
      extractMarkdownText(`
# Заголовок

Первый **абзац** с [ссылкой](https://example.com).

![Река](river.jpg)

- Первый пункт
- Второй пункт

\`\`\`ts
const value = 1
\`\`\`
`),
    ).toMatchInlineSnapshot(
      `"Заголовок Первый абзац с ссылкой. Река Первый пункт Второй пункт"`,
    );
  });
});
