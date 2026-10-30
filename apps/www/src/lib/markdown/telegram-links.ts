import { resolveMarkdownResourceReferences } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';
import { TELEGRAM_ICON_PATH } from '@shelkovo/ui/telegram-icon';
import { isTelegramUrl } from '@shelkovo/url';

import { decorateMarkdownLink } from './link-icon';
import type { MarkdownIconNode } from './link-icon.types';

const ICON_CLASS = 'ui-markdown-telegram-icon';

const transformLinks = (nodes: readonly MarkdownIconNode[]): void => {
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
      decorateMarkdownLink(node, ICON_CLASS, 'ui-markdown-telegram-label', [
        { d: TELEGRAM_ICON_PATH }
      ]);
    }

    if (node.children) transformLinks(node.children);
  }
};

/** HTML-only: keep authored labels intact in loaders, excerpts and companions. */
export const transformTelegramLinks: MarkdownAstTransform = (document) => {
  document.children = [...resolveMarkdownResourceReferences(document.children)];
  transformLinks(document.children);
};
