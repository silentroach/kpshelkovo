import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPage } from '../types';

let buildKbPageMarkdown: typeof import('../markdown').buildKbPageMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildKbPageMarkdown } = await import('../markdown'));
});

const page = (input: {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly flags?: readonly ['noindex'];
  readonly routeSlug?: string;
}): KbPage => ({
  id: input.id,
  sourceId: input.id,
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
  mentions: [],
});

describe('kb markdown companions', () => {
  it('renders a kb page as markdown and points kb links to markdown companions', () => {
    const markdown = buildKbPageMarkdown(
      page({
        id: 'services/internet/index',
        title: 'Интернет',
        routeSlug: 'services/internet',
        body: '- [База знаний](/kb/)\n- [Оптоволоконный интернет](/kb/services/internet/fiber/)\n- [Новости](/news/)\n',
      }),
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
        id: 'services/gas',
        title: 'Газ',
        routeSlug: 'services/gas',
        body: `Откройте [подключение газа](/kb/services/gas/connection/?from=guide#documents).

[Абсолютная ссылка](https://example.com/kb/services/gas/) и [новости](/news/).

\`[Пример](/kb/services/gas/)\`

\`\`\`md
[Пример](/kb/services/gas/)
\`\`\``,
      }),
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
        id: 'court/documents',
        title: 'Документы',
        flags: ['noindex'],
        routeSlug: 'court/documents',
      }),
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
