import type { Plugin } from 'unified';

import type { HtmlTreeNode } from './html-tree.types';

const toImageFigure = (node: HtmlTreeNode): HtmlTreeNode => {
  const content = node.children?.length === 1 ? node.children[0] : undefined;
  if (!content) {
    return node;
  }

  const image =
    content.tagName === 'a' && content.children?.length === 1
      ? content.children[0]
      : content;
  if (!image || image.tagName !== 'img') {
    return node;
  }

  const title = image.properties?.title;
  if (typeof title !== 'string' || !title.trim()) {
    return node;
  }

  if (image.properties) {
    delete image.properties.title;
  }

  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      className: ['ui-markdown-figure'],
    },
    children: [
      content,
      {
        type: 'element',
        tagName: 'figcaption',
        properties: {
          className: ['ui-media-caption'],
        },
        children: [
          {
            type: 'text',
            value: title.trim(),
          },
        ],
      },
    ],
  };
};

const wrapCaptionedImages = (node: HtmlTreeNode): void => {
  if (!node.children) {
    return;
  }

  node.children = node.children.map((child) => {
    wrapCaptionedImages(child);
    return child.tagName === 'p' ? toImageFigure(child) : child;
  });
};

export const rehypeImageFigures: Plugin<[], HtmlTreeNode> = () => (tree) => {
  wrapCaptionedImages(tree);
};
