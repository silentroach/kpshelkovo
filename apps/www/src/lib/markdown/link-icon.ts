import { md } from '@shelkovo/markdown';

import type { MarkdownIconLink, MarkdownIconPath } from './link-icon.types';

export const decorateMarkdownLink = (
  link: MarkdownIconLink,
  iconClass: string,
  labelClass: string,
  paths: readonly MarkdownIconPath[]
): void => {
  if (link.children[0]?.data?.hProperties?.className === iconClass) return;

  const icon = md.text('');
  icon.data = {
    hName: 'svg',
    hProperties: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      className: iconClass,
      fill: 'currentColor',
      ariaHidden: 'true',
      focusable: 'false'
    },
    hChildren: paths.map((path) => ({
      type: 'element',
      tagName: 'path',
      properties: { d: path.d, fill: path.fill },
      children: []
    }))
  };
  link.children = [
    icon,
    {
      type: 'emphasis',
      children: link.children,
      data: {
        hName: 'span',
        hProperties: { className: labelClass }
      }
    }
  ];
};
