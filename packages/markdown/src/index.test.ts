// @vitest-environment happy-dom

import { getAllByRole, getByRole } from '@testing-library/dom';
import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';

import { headingSlug } from './heading-slugs';
import {
  createMarkdownDocument,
  extractFirstMarkdownText,
  extractMarkdownText,
  formatDynamicHtml,
  md,
  parseMarkdownFragment,
  rehypeTypograf,
  render,
  resolveMarkdownResourceReferences,
  satteriTypograf,
  serializeMarkdownDocument
} from './index';

const showNbsp = (value: string): string =>
  value.replaceAll('\u00A0', '·').replaceAll('\u202F', '·');

const renderDom = (markdown: string) => {
  document.body.innerHTML = render(markdown);

  return document;
};

const checkboxLabel = (checkbox: HTMLElement): HTMLElement => {
  const labelId = checkbox.getAttribute('aria-labelledby');
  if (!labelId) {
    throw new Error('task checkbox label id not found');
  }

  const label = checkbox.ownerDocument.getElementById(labelId);
  if (!label) {
    throw new Error('task checkbox label not found');
  }

  return label;
};

describe('@shelkovo/markdown', () => {
  it('serializes YAML frontmatter without quoting every string', () => {
    const document = createMarkdownDocument({
      frontmatter: {
        title: 'Новости Шелково',
        draft: false,
        tags: ['новости', 'город']
      },
      children: [md.heading(1, 'Заголовок')]
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
                md.list([md.listItem('Вложенный'), md.listItem('Еще один')])
              ]),
              md.listItem('Второй')
            ]),
            md.list([md.listItem('Один'), md.listItem('Два'), md.listItem('Три')], {
              ordered: true
            })
          ]
        })
      )
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
          children: [{ type: 'table', children: [] }]
        })
      )
    ).toThrow('Markdown tables are not supported; use lists.');
  });

  it('parses Markdown fragments for insertion into generated documents', () => {
    const fragment = parseMarkdownFragment('Авторский **текст** с [ссылкой](https://example.com).');

    expect(
      serializeMarkdownDocument(
        createMarkdownDocument({
          children: [md.heading(2, 'Фрагмент'), ...fragment]
        })
      )
    ).toMatchInlineSnapshot(`
      "## Фрагмент

      Авторский **текст** с [ссылкой](https://example.com).
      "
    `);
  });

  it('resolves local resource references before combining fragments', () => {
    const first = resolveMarkdownResourceReferences(
      parseMarkdownFragment(
        '[Исправление][source]\n\n![Схема][image]\n\n[source]: https://example.com/first\n[image]: https://example.com/image.png "Протокол"'
      )
    );
    const second = resolveMarkdownResourceReferences(
      parseMarkdownFragment('[Уточнение][source]\n\n[source]: https://example.com/second')
    );

    expect(serializeMarkdownDocument(createMarkdownDocument({ children: [...first, ...second] })))
      .toMatchInlineSnapshot(`
      "[Исправление](https://example.com/first)

      ![Схема](https://example.com/image.png "Протокол")

      [Уточнение](https://example.com/second)
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
            md.heading(3, [md.inlineCode('index.md')])
          ]
        })
      )
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
          children: [md.paragraph('- пункт\n![alt](bad)')]
        })
      )
    ).toMatchInlineSnapshot(`
      "\\- пункт
      !\\[alt]\\(bad)
      "
    `);
  });

  it('formats dynamic HTML with project typography rules', () => {
    expect(formatDynamicHtml('Шелково Ривер')).toBe('Шелково\u00A0Ривер');
    expect(formatDynamicHtml('<p>Шелково Парк</p>')).toBe('<p>Шелково\u00A0Парк</p>');
    expect(formatDynamicHtml('Новости Шелково')).toBe('Новости Шелково');
  });

  it('keeps a word before a number sign and its number on the same line', () => {
    expect(showNbsp(formatDynamicHtml('в Приложении №1'))).toMatchInlineSnapshot(
      `"в·Приложении·№·1"`
    );
    expect(showNbsp(formatDynamicHtml('п. № 1'))).toMatchInlineSnapshot(`"п.·№·1"`);
  });

  it('formats Satteri HTML text with project typography rules', async () => {
    const result = await markdownToHtml('Шелково Ривер и `Шелково Парк`', {
      hastPlugins: [satteriTypograf()]
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
    expect(render('Текст **важный**\n\n<script>alert(1)</script>')).toMatchInlineSnapshot(`
        "<p>Текст <strong>важный</strong></p>"
      `);
  });

  it('renders a standalone image title as its visible caption', () => {
    expect(
      showNbsp(
        render(`![Карта](https://example.com/map.png "Скриншот от 14 августа 2026 года.")

Текст с ![иконкой](https://example.com/icon.png "Подсказка").

![Изображение без подписи](https://example.com/photo.png)`)
      )
    ).toMatchInlineSnapshot(`
      "<figure class="ui-markdown-figure"><img src="https://example.com/map.png" alt="Карта" loading="lazy" decoding="async"><figcaption class="ui-media-caption">Скриншот от·14·августа 2026 года.</figcaption></figure>
      <p>Текст с <img src="https://example.com/icon.png" alt="иконкой" title="Подсказка" loading="lazy" decoding="async">.</p>
      <p><img src="https://example.com/photo.png" alt="Изображение без подписи" loading="lazy" decoding="async"></p>"
    `);
  });

  it('preserves the visible caption when a standalone image is linked', () => {
    expect(
      showNbsp(
        render(
          '[![Карта](https://example.com/map.png "Схема поселка.")](https://example.com/map.png)'
        )
      )
    ).toMatchInlineSnapshot(`
      "<figure class="ui-markdown-figure"><a href="https://example.com/map.png"><img src="https://example.com/map.png" alt="Карта" loading="lazy" decoding="async"></a><figcaption class="ui-media-caption">Схема поселка.</figcaption></figure>"
    `);
  });

  it('adds stable heading ids for in-page links', () => {
    expect(render('## Что сделать сразу\n\nТекст\n\n## Что сделать сразу')).toMatchInlineSnapshot(`
        "<h2 id="что-сделать-сразу" aria-label="Что сделать сразу">Что сделать сразу<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#что-сделать-сразу" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>
        <p>Текст</p>
        <h2 id="что-сделать-сразу-2" aria-label="Что сделать сразу">Что сделать сразу<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#что-сделать-сразу-2" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>"
    `);
  });

  it('creates a heading slug from a long separator run', () => {
    expect(headingSlug(`${'-'.repeat(50_000)}Раздел`)).toBe('раздел');
  });

  it('expands [TOC] before rendering Markdown to HTML', () => {
    expect(render('[TOC]\n\n## Раздел\n\n### Детали\n\n## Раздел')).toMatchInlineSnapshot(`
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

  it('transforms code in one document while preserving its meta, references and author TOC', () => {
    let calls = 0;
    let codeMeta: string | undefined;
    const html = render(
      `[TOC]

## Section

\`\`\`diagram https://example.com/original
<unsafe> & text
\`\`\`

[Source][source]

## Section

[source]: https://example.com/source`,
      {
        transform: (tree, reserveId) => {
          calls += 1;
          tree.children = tree.children.flatMap((node) => {
            if (node.type !== 'code' || node.lang !== 'diagram') {
              return [node];
            }

            codeMeta = node.meta ?? undefined;
            return [
              {
                type: 'heading' as const,
                depth: 3 as const,
                data: { hProperties: { id: reserveId('Section') } },
                children: [{ type: 'text' as const, value: 'Diagram' }]
              },
              {
                type: 'paragraph' as const,
                data: { hName: 'aside' },
                children: [{ type: 'text' as const, value: node.value }]
              }
            ];
          });
        }
      }
    );
    document.body.innerHTML = html;

    expect({
      calls,
      codeMeta,
      toc: Array.from(document.querySelectorAll('.ui-markdown-toc__list a'), (a) =>
        a.getAttribute('href')
      ),
      headings: Array.from(document.querySelectorAll('h2, h3'), (h) => h.id),
      source: document.querySelector('p a[href="https://example.com/source"]')?.textContent,
      transformed: document.querySelector('aside')?.textContent,
      unsafeMarkup: document.querySelector('unsafe')
    }).toMatchInlineSnapshot(`
      {
        "calls": 1,
        "codeMeta": "https://example.com/original",
        "headings": [
          "section",
          "section-3",
          "section-2",
        ],
        "source": "Source",
        "toc": [
          "#section",
          "#section-2",
        ],
        "transformed": "<unsafe> & text",
        "unsafeMarkup": null,
      }
    `);
  });

  it('reserves authored and generated ids even when names resemble duplicate suffixes', () => {
    document.body.innerHTML = render(
      '[TOC]\n\n## Section\n\n```diagram\nx\n```\n\n## Section-2\n\n## Section',
      {
        transform: (tree, reserveId) => {
          tree.children = tree.children.flatMap((node) =>
            node.type === 'code'
              ? [
                  {
                    type: 'heading' as const,
                    depth: 3 as const,
                    data: { hProperties: { id: reserveId('section') } },
                    children: [{ type: 'text' as const, value: 'Section' }]
                  }
                ]
              : [node]
          );
        }
      }
    );

    expect({
      toc: Array.from(document.querySelectorAll('.ui-markdown-toc__list a'), (a) =>
        a.getAttribute('href')
      ),
      headings: Array.from(document.querySelectorAll('h2, h3'), (h) => h.id)
    }).toMatchInlineSnapshot(`
      {
        "headings": [
          "section",
          "section-4",
          "section-2",
          "section-3",
        ],
        "toc": [
          "#section",
          "#section-2",
          "#section-3",
        ],
      }
    `);
  });

  it('avoids IDs of surrounding page elements without breaking the author TOC', () => {
    document.body.innerHTML = render('[TOC]\n\n## Section\n\n```diagram\nx\n```', {
      reservedIds: ['section'],
      transform: (tree, reserveId) => {
        tree.children = tree.children.flatMap((node) =>
          node.type === 'code'
            ? [
                {
                  type: 'heading' as const,
                  depth: 3 as const,
                  data: { hProperties: { id: reserveId('section') } },
                  children: [{ type: 'text' as const, value: 'Section' }]
                }
              ]
            : [node]
        );
      }
    });

    expect({
      toc: document.querySelector('.ui-markdown-toc__list a')?.getAttribute('href'),
      ids: Array.from(document.querySelectorAll('h2, h3'), (h) => h.id)
    }).toMatchInlineSnapshot(`
      {
        "ids": [
          "section-2",
          "section-3",
        ],
        "toc": "#section-2",
      }
    `);
  });

  it('reserves blockquote and list headings before generated headings without adding them to the TOC', () => {
    document.body.innerHTML = render(
      '[TOC]\n\n> ## map\n\n- Item\n\n  ## map\n\n[Jump](#map)\n\n```diagram\na\n```\n\n```diagram\nb\n```\n\n## Article',
      {
        transform: (tree, reserveId) => {
          tree.children = tree.children.flatMap((node) =>
            node.type === 'code'
              ? [
                  {
                    type: 'heading' as const,
                    depth: 3 as const,
                    data: { hProperties: { id: reserveId('map') } },
                    children: [{ type: 'text' as const, value: 'Map' }]
                  }
                ]
              : [node]
          );
        }
      }
    );

    expect({
      toc: Array.from(document.querySelectorAll('.ui-markdown-toc__list a'), (a) =>
        a.getAttribute('href')
      ),
      headingIds: Array.from(document.querySelectorAll('h2, h3'), (h) => h.id),
      jump: document.querySelector('a[href="#map"]')?.getAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "headingIds": [
          "map",
          "map-2",
          "map-3",
          "map-4",
          "article",
        ],
        "jump": "#map",
        "toc": [
          "#article",
        ],
      }
    `);
  });

  it('keeps GFM footnote targets unique and their links intact alongside headings and generated cards', () => {
    document.body.innerHTML = render(
      '[TOC]\n\n## footnote-label\n\n## user-content-fn-1\n\n## user-content-fnref-1\n\nNote[^1] again[^1]\n\n```diagram\na\n```\n\n```diagram\nb\n```\n\n[^1]: A note',
      {
        transform: (tree, reserveId) => {
          tree.children = tree.children.flatMap((node) =>
            node.type === 'code'
              ? [
                  {
                    type: 'heading' as const,
                    depth: 3 as const,
                    data: { hProperties: { id: reserveId('user-content-fn-1') } },
                    children: [{ type: 'text' as const, value: 'Diagram' }]
                  }
                ]
              : [node]
          );
        }
      }
    );

    const ids = Array.from(document.querySelectorAll('[id]'), (node) => node.id);
    expect({
      ids,
      uniqueIds: new Set(ids).size === ids.length,
      toc: Array.from(document.querySelectorAll('.ui-markdown-toc__list a'), (a) =>
        a.getAttribute('href')
      ),
      footnoteRefs: Array.from(document.querySelectorAll('[data-footnote-ref]'), (a) => [
        a.id,
        a.getAttribute('href'),
        a.getAttribute('aria-describedby')
      ]),
      backrefs: Array.from(document.querySelectorAll('[data-footnote-backref]'), (a) =>
        a.getAttribute('href')
      )
    }).toMatchInlineSnapshot(`
      {
        "backrefs": [
          "#user-content-fnref-1",
          "#user-content-fnref-1-2",
        ],
        "footnoteRefs": [
          [
            "user-content-fnref-1",
            "#user-content-fn-1",
            "footnote-label",
          ],
          [
            "user-content-fnref-1-2",
            "#user-content-fn-1",
            "footnote-label",
          ],
        ],
        "ids": [
          "heading-footnote-label",
          "heading-user-content-fn-1",
          "heading-user-content-fnref-1",
          "user-content-fnref-1",
          "user-content-fnref-1-2",
          "heading-user-content-fn-1-2",
          "heading-user-content-fn-1-3",
          "footnote-label",
          "user-content-fn-1",
        ],
        "toc": [
          "#heading-footnote-label",
          "#heading-user-content-fn-1",
          "#heading-user-content-fnref-1",
        ],
        "uniqueIds": true,
      }
    `);
  });

  it('keeps other fenced code and fenced TOC literals with an AST transform', () => {
    document.body.innerHTML = render(
      '```change inline\n-before\n+after\n```\n\n```change block\n-before\n+after\n```\n\n```change\ninvalid\n```\n\n```diff\n[TOC]\n```\n\n```unknown\n@slug [TOC]\n```',
      { transform: () => {} }
    );

    expect(
      Array.from(document.querySelectorAll('pre code'), (code) => ({
        language: code.className,
        text: code.textContent?.trimEnd().replaceAll('\n', ' / ')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "language": "language-change",
          "text": "-before / +after",
        },
        {
          "language": "language-change",
          "text": "-before / +after",
        },
        {
          "language": "language-change",
          "text": "invalid",
        },
        {
          "language": "language-diff",
          "text": "[TOC]",
        },
        {
          "language": "language-unknown",
          "text": "@slug [TOC]",
        },
      ]
    `);
    expect(document.querySelector('.ui-markdown-toc__list')).toBeNull();
  });

  it('rejects tables when rendering Markdown strings', () => {
    expect(() => render('| Ключ | Значение |\n| --- | --- |\n| A | B |')).toThrow(
      'Markdown tables are not supported; use lists.'
    );
  });

  it('links task list checkboxes to their item text via aria-labelledby', () => {
    const document = renderDom('- [x] First task\n- [ ] Second task');
    const checkboxes = getAllByRole(document.body, 'checkbox');
    const first = getByRole(document.body, 'checkbox', {
      name: 'First task'
    }) as HTMLInputElement;
    const second = getByRole(document.body, 'checkbox', {
      name: 'Second task'
    }) as HTMLInputElement;

    expect({
      count: checkboxes.length,
      distinctLabels:
        first.getAttribute('aria-labelledby') !== second.getAttribute('aria-labelledby'),
      first: { checked: first.checked, disabled: first.disabled },
      second: { checked: second.checked, disabled: second.disabled }
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
    const labels = Array.from(document.querySelectorAll('li.task-list-item > span[id]'));

    expect(getByRole(document.body, 'checkbox', { name: 'Parent task' })).toBe(checkboxes[0]);
    expect(getByRole(document.body, 'checkbox', { name: 'Child task' })).toBe(checkboxes[1]);
    expect(getByRole(document.body, 'checkbox', { name: 'Grandchild task' })).toBe(checkboxes[2]);
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

  it('labels a task checkbox inside a loose-list paragraph', () => {
    const document = renderDom(`- [ ] Loose parent

  Additional context.

  - [x] Loose child`);
    const parentCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Loose parent'
    });
    const childCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Loose child'
    });
    const parentLabel = checkboxLabel(parentCheckbox);

    expect({
      checkboxCount: getAllByRole(document.body, 'checkbox').length,
      labelContainer: parentLabel.parentElement?.tagName,
      labelHasBlockContent: Boolean(parentLabel.querySelector('blockquote, ol, p, pre, ul')),
      parentContainer: parentCheckbox.parentElement?.tagName,
      childChecked: (childCheckbox as HTMLInputElement).checked
    }).toMatchInlineSnapshot(`
      {
        "checkboxCount": 2,
        "childChecked": true,
        "labelContainer": "P",
        "labelHasBlockContent": false,
        "parentContainer": "P",
      }
    `);
  });

  it('keeps a task list inside a blockquote outside the parent label', () => {
    const document = renderDom(`- [ ] Parent task
  > - [x] Quoted child`);
    const parentCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Parent task'
    });
    const childCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Quoted child'
    });
    const parentLabel = checkboxLabel(parentCheckbox);
    const childLabel = checkboxLabel(childCheckbox);
    const blockquote = parentCheckbox.closest('li')?.querySelector('blockquote');

    if (!blockquote) {
      throw new Error('nested task blockquote not found');
    }

    expect({
      blockquoteIsLabelSibling: parentLabel.nextElementSibling === blockquote,
      labelsHaveBlockContent: [parentLabel, childLabel].some((label) =>
        Boolean(label.querySelector('blockquote, ol, p, pre, ul'))
      ),
      parentLabelContainsBlockquote: parentLabel.contains(blockquote)
    }).toMatchInlineSnapshot(`
      {
        "blockquoteIsLabelSibling": true,
        "labelsHaveBlockContent": false,
        "parentLabelContainsBlockquote": false,
      }
    `);
  });

  it('preserves links and formatting in nested task labels', () => {
    const document = renderDom(`- [ ] **Parent** with [guide](https://example.com/guide)
  - [x] _Child_ with \`code\``);
    const parentCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Parent with guide'
    });
    const childCheckbox = getByRole(document.body, 'checkbox', {
      name: 'Child with code'
    });
    const parentLabel = checkboxLabel(parentCheckbox);
    const childLabel = checkboxLabel(childCheckbox);

    expect({
      childCode: childLabel.querySelector('code')?.textContent,
      childEmphasis: childLabel.querySelector('em')?.textContent,
      parentLink: parentLabel.querySelector('a')?.getAttribute('href'),
      parentStrong: parentLabel.querySelector('strong')?.textContent
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
        preprocess: (markdown) => markdown.replace('@person', '[Анна](/people/anna/)')
      })
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
`)
    ).toBe('Река');

    expect(extractFirstMarkdownText('```ts\nconst value = 1\n```')).toBeUndefined();
  });

  it.each([
    ['paragraph', '  First  paragraph. \t\n\nIgnored paragraph.'],
    ['soft break', 'First\nparagraph.'],
    ['CRLF and tabs', 'First\t\r\nparagraph.'],
    ['hard break', 'First  \nparagraph.'],
    ['backslash break', 'First\\\nparagraph.'],
    ['inline markup', '**First** [*paragraph*](https://example.com).'],
    ['inline code', 'First `paragraph.`'],
    ['non-breaking spaces', '\u00A0First\u00A0\u202Fparagraph.\u00A0'],
    ['space entities', '&nbsp;First&nbsp;&#160;paragraph.&#x202f;'],
    ['empty first block', '&nbsp;\n\nFirst paragraph.']
  ])('returns normalized first text for %s', (_name, markdown) => {
    expect(showNbsp(extractFirstMarkdownText(markdown) ?? '')).toMatchInlineSnapshot(
      `"First paragraph."`
    );
  });

  it.each([
    '',
    ' \t\r\n\u00A0\u202F',
    '&nbsp;\n\n&#160;',
    '<!-- hidden -->',
    '[reference]: https://example.com',
    '![](image.jpg)',
    '---\n\n```ts\nconst value = 1\n```'
  ])('returns undefined when markdown has no readable text: %j', (markdown) => {
    expect(extractFirstMarkdownText(markdown)).toBeUndefined();
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
`)
    ).toMatchInlineSnapshot(`"Заголовок Первый абзац с ссылкой. Река Первый пункт Второй пункт"`);
  });

  it('excludes YAML frontmatter from extracted text', () => {
    const frontmatterOnly = `---
title: Служебный заголовок
description: Служебное описание
---`;
    const document = `${frontmatterOnly}

# Заголовок

Первый **абзац**.

- Первый пункт

![Река](river.jpg)`;

    expect({
      allFromDocument: extractMarkdownText(document),
      allFromFrontmatterOnly: extractMarkdownText(frontmatterOnly),
      firstFromDocument: extractFirstMarkdownText(document),
      firstFromEmptyFrontmatter: extractFirstMarkdownText(
        '---\n---\n\nТекст после пустых настроек.'
      ),
      firstFromFrontmatterOnly: extractFirstMarkdownText(frontmatterOnly),
      firstFromUnclosedDelimiter: extractFirstMarkdownText('---\n\n# Это обычный Markdown')
    }).toMatchInlineSnapshot(`
      {
        "allFromDocument": "Заголовок Первый абзац. Первый пункт Река",
        "allFromFrontmatterOnly": undefined,
        "firstFromDocument": "Заголовок",
        "firstFromEmptyFrontmatter": "Текст после пустых настроек.",
        "firstFromFrontmatterOnly": undefined,
        "firstFromUnclosedDelimiter": "Это обычный Markdown",
      }
    `);
  });
});
