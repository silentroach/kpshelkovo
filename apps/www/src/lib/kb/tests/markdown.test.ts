import { parseMarkdownFragment } from '@shelkovo/markdown';
import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPage } from '../types';

let buildKbPageMarkdown: typeof import('../markdown').buildKbPageMarkdown;
let buildKbPages: typeof import('../load').buildKbPages;
let renderMarkdown: typeof import('@/lib/markdown/render').renderMarkdown;
let createKbPageMentionRefs: typeof import('../mentions').createKbPageMentionRefs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildKbPageMarkdown } = await import('../markdown'));
  ({ buildKbPages } = await import('../load'));
  ({ renderMarkdown } = await import('@/lib/markdown/render'));
  ({ createKbPageMentionRefs } = await import('../mentions'));
});

const page = (input: {
  readonly title: string;
  readonly body?: string;
  readonly flags?: readonly ['noindex'];
  readonly routeSlug?: string;
}): KbPage => ({
  title: input.title,
  flags: input.flags ?? [],
  robots: input.flags?.includes('noindex') ? 'noindex, follow' : undefined,
  url: input.routeSlug ? `/kb/${input.routeSlug}/` : '/kb/',
  canonical: input.routeSlug
    ? `https://example.com/kb/${input.routeSlug}/`
    : 'https://example.com/kb/',
  routeSlug: input.routeSlug,
  isSection: !input.routeSlug,
  body: input.body ?? '',
  mentions: []
});

describe('kb markdown companions', () => {
  it('keeps table values through the loader, HTML rendering and companion links', () => {
    const [entry] = buildKbPages([
      {
        id: 'test',
        data: { title: 'Табличные данные' },
        body: '| № | Работа | Частота |\n| - | - | - |\n| 7 | **[Газ](/kb/services/gas/)** | По запросу |'
      }
    ]);
    expect(entry).toBeDefined();
    if (!entry) throw new Error('Expected KB page');
    const html = renderMarkdown(entry.body, { allowTables: true });
    expect(html).toContain('data-ui-sticky-table-shell');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(buildKbPageMarkdown(entry)).toMatchInlineSnapshot(`
      "---
      title: Табличные данные
      ---

      # Табличные данные

      - №: 7

        Работа: **[Газ](https://example.com/kb/services/gas/index.md)**

        Частота: По запросу
      "
    `);
  });
  it('resolves entity mentions inside table cells in both presentations', () => {
    const [entry] = buildKbPages(
      [
        {
          id: 'travel',
          data: { title: 'Проезд' },
          body: '> [!NOTE]\n> Пояснение.\n\n| Место | Правило |\n| - | - |\n| @gate | [Справка](/kb/ok/) |'
        }
      ],
      {
        mentionRegistry: new Map([
          [
            'gate',
            {
              type: 'place',
              slug: 'gate',
              label: 'КПП',
              htmlUrl: '/map/gate/',
              markdownUrl: '/map/gate/index.md'
            }
          ]
        ])
      }
    );
    if (!entry) throw new Error('Expected KB page');
    expect(renderMarkdown(entry.body, { allowTables: true })).toContain('href="/map/gate/"');
    expect(buildKbPageMarkdown(entry)).toContain('[КПП](/map/gate/)');
    expect(createKbPageMentionRefs(entry).map((ref) => ref.excerpt)).toMatchInlineSnapshot(`
      [
        "Примечание Пояснение.",
      ]
    `);
  });
  it('removes editorial markers while preserving the title and KB source link', () => {
    const markdown = buildKbPageMarkdown(
      page({
        title: 'Условия',
        routeSlug: 'test',
        body: '> [!NOTE]\n> **Условие**\n>\n> Проверка.\n>\n> [!SOURCE]\n> См. [справку](/kb/services/gas/).'
      })
    );
    expect(markdown.includes('[!')).toBe(false);
    expect(markdown.match(/\*\*Условие\*\*/gu)).toHaveLength(1);
    expect(markdown).toContain('https://example.com/kb/services/gas/index.md');
  });
  it('keeps the original map URL and data while rewriting neighboring KB links', () => {
    const raw = JSON.stringify({
      type: 'FeatureCollection',
      metadata: { name: 'Схема' },
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [37, 55] } }
      ]
    });
    const markdown = buildKbPageMarkdown(
      page({
        title: 'Интернет',
        body: `[Подробнее](/kb/services/internet/?part=1#access)\n\n\`\`\`map https://example.com/map\n${raw}\n\`\`\``
      })
    );
    const nodes = parseMarkdownFragment(markdown);
    const code = nodes.find((node) => node.type === 'code');

    expect(code?.type === 'code' ? [code.lang, code.meta, code.value] : undefined)
      .toMatchInlineSnapshot(`
        [
          "map",
          "https://example.com/map",
          "{"type":"FeatureCollection","metadata":{"name":"Схема"},"features":[{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[37,55]}}]}",
        ]
      `);
    expect(markdown).toContain('https://example.com/kb/services/internet/index.md?part=1#access');
    expect(markdown).toContain('[Схема](https://example.com/map)');
    expect(markdown.match(/\[Схема\]\(https:\/\/example\.com\/map\)/gu)).toHaveLength(1);
  });
  it('renders a kb page as markdown and points kb links to markdown companions', () => {
    const markdown = buildKbPageMarkdown(
      page({
        title: 'Интернет',
        routeSlug: 'services/internet',
        body: '- [База знаний](/kb/)\n- [Оптоволоконный интернет](/kb/services/internet/fiber/)\n- [Новости](/news/)\n'
      })
    );

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Интернет
      ---

      # Интернет

      - [База знаний](https://example.com/kb/index.md)
      - [Оптоволоконный интернет](https://example.com/kb/services/internet/fiber/index.md)
      - [Новости](/news/)
      "
    `);
  });

  it('rewrites only kb link nodes and preserves their query and hash', () => {
    const markdown = buildKbPageMarkdown(
      page({
        title: 'Газ',
        routeSlug: 'services/gas',
        body: `Откройте [подключение газа](/kb/services/gas/connection/?from=guide#documents).

[Абсолютная ссылка](https://example.com/kb/services/gas/) и [новости](/news/).

\`[Пример](/kb/services/gas/)\`

\`\`\`md
[Пример](/kb/services/gas/)
\`\`\``
      })
    );

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Газ
      ---

      # Газ

      Откройте [подключение газа](https://example.com/kb/services/gas/connection/index.md?from=guide#documents).

      [Абсолютная ссылка](https://example.com/kb/services/gas/) и [новости](/news/).

      \`[Пример](/kb/services/gas/)\`

      \`\`\`md
      [Пример](/kb/services/gas/)
      \`\`\`
      "
    `);
  });

  it('keeps supported page flags in markdown frontmatter', () => {
    const markdown = buildKbPageMarkdown(
      page({
        title: 'Документы',
        flags: ['noindex'],
        routeSlug: 'court/documents'
      })
    );

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Документы
      flags:
        - noindex
      ---

      # Документы
      "
    `);
  });
});
