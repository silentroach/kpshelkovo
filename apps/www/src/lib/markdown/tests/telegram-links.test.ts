// @vitest-environment happy-dom

import { parseMarkdownFragment, render, renderWithMetadata } from '@shelkovo/markdown';
import { beforeAll, describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { preprocessSiteMarkdown, renderMarkdown, renderMarkdownWithMetadata } from '../render';
import { transformTelegramLinks } from '../telegram-links';

let buildKbPageMarkdown: typeof import('@/lib/kb/markdown').buildKbPageMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ buildKbPageMarkdown } = await import('@/lib/kb/markdown'));
});

const documentFor = (markdown: string) => {
  document.body.innerHTML = renderMarkdown(markdown);
  return document;
};

describe('Telegram links in site Markdown', () => {
  it.each([
    ['[@Resident_Name](https://t.me/resident_name)', 'Resident_Name'],
    ['[@Resident_Name](http://www.telegram.me/resident_name/)', 'Resident_Name'],
    ['[Resident_Name](https://t.me/resident_name)', 'Resident_Name'],
    ['[чат праздника](https://t.me/resident_name)', 'чат праздника'],
    ['[@other_name](https://t.me/resident_name)', '@other_name'],
    ['[**@resident_name**](https://t.me/resident_name)', '@resident_name'],
    ['[`@resident_name`](https://t.me/resident_name)', '@resident_name'],
    ['[@resident_name](https://t.me/resident_name/123)', '@resident_name'],
    ['[@resident_name](https://t.me/resident_name/123/456)', '@resident_name'],
    ['[@resident_name](https://t.me/+invite)', '@resident_name'],
    ['[@resident_name](https://t.me/joinchat/invite)', '@resident_name'],
    ['[@resident_name](https://t.me/resident_name?start=hello)', '@resident_name'],
    ['[@resident_name](https://t.me/resident_name#section)', '@resident_name'],
    ['[@resident_name](tg://resolve?domain=resident_name)', '@resident_name'],
    ['https://t.me/resident_name', 'https://t.me/resident_name'],
    ['<https://telegram.me/resident_name>', 'https://telegram.me/resident_name'],
    ['[@Resident_Name][contact]\n\n[contact]: https://t.me/resident_name', 'Resident_Name']
  ])('decorates %s and preserves the appropriate label', (markdown, label) => {
    const link = documentFor(markdown).querySelector('a');
    expect(link?.textContent?.replaceAll('\u00a0', ' ')).toBe(label);
    expect(link?.querySelectorAll('svg')).toHaveLength(1);
  });

  it('preserves author markup, destination and accessible text', () => {
    const page = documentFor(
      '[чат **праздника**](https://t.me/example_chat?thread=1&message=2 "Встреча & чат")'
    );
    const link = page.querySelector('a')!;
    const icon = link.querySelector('svg')!;
    expect({
      text: link.textContent?.replaceAll('\u00a0', ' '),
      emphasis: link.querySelector('strong')?.textContent,
      href: link.getAttribute('href'),
      title: link.getAttribute('title'),
      ariaLabel: link.getAttribute('aria-label') ?? undefined,
      target: link.getAttribute('target') ?? undefined,
      hiddenIcon: icon.getAttribute('aria-hidden'),
      focusableIcon: icon.getAttribute('focusable'),
      iconText: icon.textContent
    }).toMatchInlineSnapshot(`
      {
        "ariaLabel": undefined,
        "emphasis": "праздника",
        "focusableIcon": "false",
        "hiddenIcon": "true",
        "href": "https://t.me/example_chat?thread=1&message=2",
        "iconText": "",
        "target": undefined,
        "text": "чат праздника",
        "title": "Встреча & чат",
      }
    `);
  });

  it('leaves non-Telegram URLs and literal code alone', () => {
    const page = documentFor(`[Telegram](https://example.com/t.me/resident)

[Other](https://t.me.example.com/resident)

[Contact](https://example.com/?url=https://t.me/resident)

\`[@resident](https://t.me/resident)\`

\`\`\`md
[@resident](https://t.me/resident)
\`\`\``);
    expect(page.querySelectorAll('svg')).toHaveLength(0);
    expect([...page.querySelectorAll('code')].map((code) => code.textContent))
      .toMatchInlineSnapshot(`
        [
          "[@resident](https://t.me/resident)",
          "[@resident](https://t.me/resident)
        ",
        ]
      `);
  });

  it('preserves a standalone linked image caption without promoting inline or multiple images', () => {
    const page = documentFor(`[![Карта](/photo.png "Схема поселка.")](https://t.me/example_chat)

Текст с [![Значок](/inline.png "Подсказка")](https://t.me/example_chat).

[![Один](/one.png "Первая") ![Два](/two.png "Вторая")](https://t.me/example_chat)`);
    const figure = page.querySelector('figure');
    expect({
      figures: page.querySelectorAll('figure').length,
      caption: figure?.querySelector('figcaption')?.textContent,
      href: figure?.querySelector('a')?.getAttribute('href'),
      iconCount: figure?.querySelectorAll('a svg').length,
      imageAlt: figure?.querySelector('img')?.getAttribute('alt'),
      imageTitle: figure?.querySelector('img')?.getAttribute('title') ?? undefined,
      inlineTitles: [...page.querySelectorAll('p img')].map((image) => image.getAttribute('title'))
    }).toMatchInlineSnapshot(`
      {
        "caption": "Схема поселка.",
        "figures": 1,
        "href": "https://t.me/example_chat",
        "iconCount": 1,
        "imageAlt": "Карта",
        "imageTitle": undefined,
        "inlineTitles": [
          "Подсказка",
          "Первая",
          "Вторая",
        ],
      }
    `);
  });

  it('retains references, PDF links, mentions and stable heading targets', () => {
    const markdown = `[TOC]

## [@Resident_Name](https://t.me/resident_name)

@neighbor [Document][pdf] [Website](https://example.com) [Jump](#resident_name).

[^note]: [чат **праздника**][chat]

Footnote[^note].

[pdf]: /plan.pdf "Original"
[chat]: https://t.me/example_chat`;
    const mentions = {
      registry: new Map([['neighbor', createPersonMentionTarget('neighbor', 'Сосед')]]),
      context: 'telegram integration'
    };
    const result = renderMarkdownWithMetadata(markdown, { mentions, idPrefix: 'body-' });
    const baseline = renderWithMetadata(preprocessSiteMarkdown(markdown, { mentions }).markdown, {
      idPrefix: 'body-'
    });
    document.body.innerHTML = result.html;
    expect([...result.localIds]).toEqual([...baseline.localIds]);
    expect({
      telegram: document.querySelector('h2 > a')?.textContent,
      headingName: document.querySelector('h2')?.getAttribute('aria-label'),
      neighbor: document.querySelector('a[href="/people/neighbor/"]')?.textContent,
      pdf: document.querySelector('a[href="/plan.pdf"]')?.textContent,
      pdfIcon: document.querySelectorAll('a[href="/plan.pdf"] svg').length,
      ordinaryIcon: document.querySelectorAll('a[href="https://example.com"] svg').length,
      footnoteEmphasis: document.querySelector('a[href="https://t.me/example_chat"] strong')
        ?.textContent,
      telegramIcons: document.querySelectorAll('a[href^="https://t.me/"] svg').length
    }).toMatchInlineSnapshot(`
      {
        "footnoteEmphasis": "праздника",
        "headingName": "Resident_Name",
        "neighbor": "Сосед",
        "ordinaryIcon": 0,
        "pdf": "Document",
        "pdfIcon": 1,
        "telegram": "Resident_Name",
        "telegramIcons": 2,
      }
    `);
    for (const link of document.querySelectorAll('a[href^="#body-"]')) {
      expect(
        document.getElementById(decodeURIComponent(link.getAttribute('href')!.slice(1)))
      ).toBeTruthy();
    }
  });

  it('decorates an existing AST only once', () => {
    const tree = {
      type: 'root' as const,
      children: [
        ...parseMarkdownFragment(
          '[@Resident_Name][contact]\n\n[contact]: https://t.me/resident_name'
        )
      ]
    };
    transformTelegramLinks(tree, (id) => id);
    const once = structuredClone(tree);
    transformTelegramLinks(tree, (id) => id);
    expect(tree).toEqual(once);
  });

  it('keeps the source link in preprocessing, low-level render and a real KB companion', () => {
    const markdown = '[@Resident_Name](https://t.me/resident_name "Contact")';
    const prepared = preprocessSiteMarkdown(markdown).markdown;
    const companion = buildKbPageMarkdown({
      title: 'Контакт',
      flags: [],
      url: '/kb/contact/',
      canonical: 'https://example.com/kb/contact/',
      routeSlug: 'contact',
      isSection: false,
      body: prepared,
      mentions: []
    });
    const paragraph = parseMarkdownFragment(companion).find((node) => node.type === 'paragraph');
    const link = paragraph?.children.find((node) => node.type === 'link');
    expect({
      prepared,
      lowLevelHtml: render(prepared),
      companionLink: link && {
        url: link.url,
        title: link.title,
        children: link.children.map((child) => (child.type === 'text' ? child.value : child.type))
      },
      companionHasSvg: companion.includes('<svg')
    }).toMatchInlineSnapshot(`
      {
        "companionHasSvg": false,
        "companionLink": {
          "children": [
            "@Resident_Name",
          ],
          "title": "Contact",
          "url": "https://t.me/resident_name",
        },
        "lowLevelHtml": "<p><a href="https://t.me/resident_name" title="Contact">@Resident_Name</a></p>",
        "prepared": "[@Resident_Name](https://t.me/resident_name "Contact")",
      }
    `);
  });
});
