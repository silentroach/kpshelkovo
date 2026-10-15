import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createNewsArticleMentionRefs } from '@/lib/news/mentions';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import { extractFirstContentText, transformContentEmphasis } from '../content-emphasis';
import { preprocessSiteMarkdown, renderMarkdown } from '../render';

const documentFor = (markdown: string) => {
  const document = new Window().document;
  document.body.innerHTML = renderMarkdown(markdown, { editorialMaps: true });
  return document;
};

const companion = (markdown: string): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      children: transformContentEmphasis(parseMarkdownFragment(markdown), 'markdown')
    })
  );

describe('editorial emphasis', () => {
  it('preserves references, mentions, TOC and maps in one document', () => {
    const person = createPersonMentionTarget('resident', 'Житель');
    const prepared = preprocessSiteMarkdown(
      `> [!NOTE]
> **Условия**
>
> Первый абзац: @resident.
>
> [!SOURCE]
> См. [документ][source].
>
> Второй абзац.
>
> - пункт

[TOC]

## Раздел

\`\`\`map
{"type":"FeatureCollection","metadata":{"name":"Схема"},"features":[{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[37,55]}}]}
\`\`\`

[source]: https://example.com/source`,
      { mentions: { registry: new Map([['resident', person]]), context: 'test' } }
    );
    const document = documentFor(prepared.markdown);
    const callout = document.querySelector('aside');
    const refs = createNewsArticleMentionRefs({
      id: '2026/01/test',
      title: 'Материал',
      url: '/news/2026/01/test/',
      markdownUrl: '/news/2026/01/test/index.md',
      body: prepared.markdown,
      mentions: prepared.mentions,
      events: [],
      publishedIso: '2026-01-01',
      publishedAt: new Date('2026-01-01')
    });
    expect({
      title: callout?.querySelector('.ui-callout__title')?.textContent,
      paragraphs: [...(callout?.querySelectorAll('p') ?? [])].map((p) => p.textContent),
      source: callout?.querySelector('.ui-callout__source a')?.getAttribute('href'),
      person: callout?.querySelector('a')?.getAttribute('href'),
      toc: [...document.querySelectorAll('.ui-markdown-toc__list a')].map((a) =>
        a.getAttribute('href')
      ),
      maps: document.querySelectorAll('editorial-map').length,
      backlink: refs.map((ref) => ({ excerpt: ref.excerpt, source: ref.source })),
      markersInCompanion: /\[!(?:NOTE|SOURCE)\]/u.test(companion(prepared.markdown)),
      sourceInCompanion: companion(prepared.markdown).includes('[документ][source]')
    }).toMatchSnapshot();
  });

  it('uses default titles and keeps a source paragraph distinct from following text', () => {
    const document = documentFor(`> [!WARNING]
> Осторожно.
>
> [!SOURCE]
> [Основание](https://example.com).
>
> Продолжение.

> [!NOTE]
>
> Пояснение.`);
    expect(
      [...document.querySelectorAll('aside')].map((block) => ({
        title: block.querySelector('.ui-callout__title')?.textContent,
        paragraphs: [...block.querySelectorAll('p')].map((p) => ({
          text: p.textContent,
          source: p.classList.contains('ui-callout__source')
        })),
        alert: block.getAttribute('role') ?? undefined
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "alert": undefined,
          "paragraphs": [
            {
              "source": false,
              "text": "Внимание",
            },
            {
              "source": false,
              "text": "Осторожно.",
            },
            {
              "source": true,
              "text": "Основание.",
            },
            {
              "source": false,
              "text": "Продолжение.",
            },
          ],
          "title": "Внимание",
        },
        {
          "alert": undefined,
          "paragraphs": [
            {
              "source": false,
              "text": "Примечание",
            },
            {
              "source": false,
              "text": "Пояснение.",
            },
          ],
          "title": "Примечание",
        },
      ]
    `);
  });

  it('leaves ordinary quotes, unknown markers, inline code and fenced code alone', () => {
    const markdown = `> Цитата.

> [!TIP]
> Обычный текст.

> \`[!NOTE]\`
> Пример.

> [!SOURCE]
> Вне выделения.

\`\`\`md
> [!WARNING]
> Код.
\`\`\``;
    const document = documentFor(markdown);
    expect({
      callouts: document.querySelectorAll('aside').length,
      quotes: document.querySelectorAll('blockquote').length,
      code: document.querySelector('pre')?.textContent,
      excerpt: extractFirstContentText('> `[!NOTE]`\n> Пример.'),
      companionMarkers: companion(markdown).includes('[!TIP]')
    }).toMatchInlineSnapshot(`
      {
        "callouts": 0,
        "code": "> [!WARNING]
      > Код.
      ",
        "companionMarkers": true,
        "excerpt": "[!NOTE] Пример.",
        "quotes": 4,
      }
    `);
  });

  it('normalizes companions once without losing nested content or literal code', () => {
    const markdown = `> [!WARNING]
> **Важно**
>
> Проверка [ссылки](https://example.com).
>
> [!SOURCE]
> Сведения @resident.
>
> - один
> - два
>
> \`[!SOURCE]\``;
    const normalized = companion(markdown);
    expect(normalized).toMatchInlineSnapshot(`
      "> **Важно**
      >
      > Проверка [ссылки](https://example.com).
      >
      > Сведения @resident.
      >
      > - один
      > - два
      >
      > \`[!SOURCE]\`
      "
    `);
    expect(companion(normalized)).toBe(normalized);
    expect(extractFirstContentText(markdown)).toMatchInlineSnapshot(
      `"Важно Проверка ссылки. Сведения @resident. один два [!SOURCE]"`
    );
  });
});
