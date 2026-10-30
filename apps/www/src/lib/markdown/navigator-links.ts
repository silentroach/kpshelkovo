import { resolveMarkdownResourceReferences } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';

import { decorateMarkdownLink } from './link-icon';
import type { MarkdownIconNode, MarkdownIconPath } from './link-icon.types';

const NAVIGATOR_ICON_PATHS: readonly MarkdownIconPath[] = [
  { d: 'M2 10.5 22 2 12.5 11.5Z', fill: '#ffdf68' },
  { d: 'M2 10.5 12.5 11.5 14 23 10 14.5Z', fill: '#e5a400' },
  { d: 'M12.5 11.5 22 2 14 23Z', fill: '#ffcc00' }
];

const isNavigatorUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'yandexnavi:';
  } catch {
    return false;
  }
};

const transformLinks = (nodes: readonly MarkdownIconNode[]): void => {
  for (const node of nodes) {
    if (node.type === 'link' && isNavigatorUrl(node.url)) {
      decorateMarkdownLink(
        node,
        'ui-markdown-navigator-icon',
        'ui-markdown-navigator-label',
        NAVIGATOR_ICON_PATHS
      );
    }

    if (node.children) transformLinks(node.children);
  }
};

/** HTML-only: companions retain the authored link without decorative markup. */
export const transformNavigatorLinks: MarkdownAstTransform = (document) => {
  document.children = [...resolveMarkdownResourceReferences(document.children)];
  transformLinks(document.children);
};
