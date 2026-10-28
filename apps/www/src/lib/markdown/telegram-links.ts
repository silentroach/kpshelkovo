import { md, resolveMarkdownResourceReferences } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';
import { TELEGRAM_ICON_PATH } from '@shelkovo/ui/telegram-icon';
import { isTelegramUrl } from '@shelkovo/url';

import type { TelegramMarkdownNode } from './telegram-links.types';

const ICON_CLASS = 'ui-markdown-telegram-icon';

const telegramIcon = () => {
  const icon = md.text('');
  icon.data = {
    hName: 'svg',
    hProperties: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      className: ICON_CLASS,
      fill: 'currentColor',
      ariaHidden: 'true',
      focusable: 'false'
    },
    hChildren: [
      { type: 'element', tagName: 'path', properties: { d: TELEGRAM_ICON_PATH }, children: [] }
    ]
  };
  return icon;
};

const transformLinks = (nodes: readonly TelegramMarkdownNode[]): void => {
  for (const node of nodes) {
    if (node.type === 'link' && isTelegramUrl(node.url)) {
      const first = node.children[0];
      if (first?.data?.hProperties?.className === ICON_CLASS) continue;

      const url = new URL(node.url);
      const username =
        /^https?:$/u.test(url.protocol) && !url.search && !url.hash
          ? /^\/([a-z0-9_]+)\/?$/iu.exec(url.pathname)?.[1]
          : undefined;
      if (
        username &&
        node.children.length === 1 &&
        first?.type === 'text' &&
        first.value.toLowerCase() === `@${username.toLowerCase()}`
      ) {
        first.value = first.value.slice(1);
      }
      node.children = [
        telegramIcon(),
        {
          type: 'emphasis',
          children: node.children,
          data: {
            hName: 'span',
            hProperties: { className: 'ui-markdown-telegram-label' }
          }
        }
      ];
    }

    if (node.children) transformLinks(node.children);
  }
};

/** HTML-only: keep authored labels intact in loaders, excerpts and companions. */
export const transformTelegramLinks: MarkdownAstTransform = (document) => {
  document.children = [...resolveMarkdownResourceReferences(document.children)];
  transformLinks(document.children);
};
