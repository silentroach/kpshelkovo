// @vitest-environment happy-dom

import { parseMarkdownFragment, render } from '@shelkovo/markdown';
import { beforeAll, describe, expect, it } from 'vitest';

import { transformNavigatorLinks } from '../navigator-links';
import { preprocessSiteMarkdown, renderMarkdown } from '../render';

const ROUTE =
  'yandexnavi://build_route_on_map?lat_from=55.069083&lon_from=37.738282&lat_to=55.062483&lon_to=37.708384&lat_via_0=55.06729903&lon_via_0=37.74148255&lat_via_1=55.065544&lon_via_1=37.74327';

let buildKbPageMarkdown: typeof import('@/lib/kb/markdown').buildKbPageMarkdown;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ buildKbPageMarkdown } = await import('@/lib/kb/markdown'));
});

const documentFor = (markdown: string) => {
  document.body.innerHTML = renderMarkdown(markdown);
  return document;
};

describe('Navigator links in site Markdown', () => {
  it.each([
    [`[Маршрут](${ROUTE})`, ROUTE],
    [`[Маршрут][route]\n\n[route]: ${ROUTE}`, ROUTE],
    [`<${ROUTE}>`, ROUTE],
    [
      '[Маршрут](YANDEXNAVI://build_route_on_map?lat_to=55&lon_to=37)',
      'YANDEXNAVI://build_route_on_map?lat_to=55&lon_to=37'
    ],
    [
      '[Точка](yandexnavi://show_point_on_map?lat=55&lon=37&desc=A%20%26%20B)',
      'yandexnavi://show_point_on_map?lat=55&lon=37&desc=A%20%26%20B'
    ]
  ])('decorates %s without rewriting its destination', (markdown, url) => {
    const link = documentFor(markdown).querySelector('a')!;
    expect(link.getAttribute('href')).toBe(url);
    expect(link.querySelectorAll('svg')).toHaveLength(1);
  });

  it('keeps author markup and accessible text while hiding the icon', () => {
    const link = documentFor(`[Маршрут **группы**](${ROUTE} "Все остановки")`).querySelector('a')!;
    const icon = link.querySelector('svg')!;
    expect({
      label: link.textContent?.replaceAll('\u00a0', ' '),
      emphasis: link.querySelector('strong')?.textContent,
      title: link.getAttribute('title'),
      accessibleOverride: link.getAttribute('aria-label') ?? undefined,
      linkTabIndex: link.tabIndex,
      iconHidden: icon.getAttribute('aria-hidden'),
      iconFocusable: icon.getAttribute('focusable'),
      iconText: icon.textContent
    }).toMatchInlineSnapshot(`
      {
        "accessibleOverride": undefined,
        "emphasis": "группы",
        "iconFocusable": "false",
        "iconHidden": "true",
        "iconText": "",
        "label": "Маршрут группы",
        "linkTabIndex": 0,
        "title": "Все остановки",
      }
    `);
  });

  it('leaves other schemes and code alone, preserving Telegram and PDF decoration', () => {
    const page = documentFor(`[yandexnavi](https://example.com/yandexnavi)

[Other](https://yandexnavi.example.com/?url=yandexnavi://build_route_on_map)

[Other](yandexnavi-other://build_route_on_map)

[Карты](yandexmaps://maps.yandex.ru/)

[Чат](https://t.me/example_chat) [Документ](/plan.pdf)

\`[Маршрут](${ROUTE})\`

\`\`\`md
[Маршрут](${ROUTE})
\`\`\``);
    expect(
      [...page.querySelectorAll('a')].map((link) => ({
        label: link.textContent,
        icons: link.querySelectorAll('svg').length
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "icons": 0,
          "label": "yandexnavi",
        },
        {
          "icons": 0,
          "label": "Other",
        },
        {
          "icons": 0,
          "label": "Other",
        },
        {
          "icons": 0,
          "label": "Карты",
        },
        {
          "icons": 1,
          "label": "Чат",
        },
        {
          "icons": 1,
          "label": "Документ",
        },
      ]
    `);
    expect(page.querySelectorAll('code svg')).toHaveLength(0);
    expect(page.querySelectorAll('code')).toHaveLength(2);
  });

  it('preserves a linked image figure and caption', () => {
    const page = documentFor(`[![Схема](/route.png "Остановки группы")](${ROUTE})`);
    const figure = page.querySelector('figure')!;
    expect({
      caption: figure.querySelector('figcaption')?.textContent,
      imageAlt: figure.querySelector('img')?.getAttribute('alt'),
      href: figure.querySelector('a')?.getAttribute('href'),
      icons: figure.querySelectorAll('a svg').length
    }).toMatchInlineSnapshot(`
      {
        "caption": "Остановки группы",
        "href": "yandexnavi://build_route_on_map?lat_from=55.069083&lon_from=37.738282&lat_to=55.062483&lon_to=37.708384&lat_via_0=55.06729903&lon_via_0=37.74148255&lat_via_1=55.065544&lon_via_1=37.74327",
        "icons": 1,
        "imageAlt": "Схема",
      }
    `);
  });

  it('decorates an existing AST only once', () => {
    const tree = {
      type: 'root' as const,
      children: [...parseMarkdownFragment(`[Маршрут][route]\n\n[route]: ${ROUTE}`)]
    };
    transformNavigatorLinks(tree, (id) => id);
    const once = structuredClone(tree);
    transformNavigatorLinks(tree, (id) => id);
    expect(tree).toEqual(once);
  });

  it('keeps ordinary author links in preprocessing, package render and KB companion', () => {
    const markdown = `[Маршрут **группы**](${ROUTE} "Остановки")`;
    const prepared = preprocessSiteMarkdown(markdown).markdown;
    const companion = buildKbPageMarkdown({
      title: 'Маршрут',
      flags: [],
      url: '/kb/route/',
      canonical: 'https://example.com/kb/route/',
      routeSlug: 'route',
      isSection: false,
      body: prepared,
      mentions: []
    });
    const paragraph = parseMarkdownFragment(companion).find((node) => node.type === 'paragraph');
    const link = paragraph?.children.find((node) => node.type === 'link');
    expect(link).toMatchObject({
      url: ROUTE,
      title: 'Остановки',
      children: [
        { type: 'text', value: 'Маршрут ' },
        { type: 'strong', children: [{ type: 'text', value: 'группы' }] }
      ]
    });
    expect(prepared).toBe(markdown);
    expect(companion).not.toContain('<svg');
    expect(render(prepared)).not.toContain('<svg');
  });
});
