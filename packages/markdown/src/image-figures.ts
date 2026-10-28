import type { Plugin } from 'unified';

import type { HtmlTreeNode } from './html-tree.types';

/** Inline wrappers and decorative SVG do not change a linked image's content. */
const contentImage = (node: HtmlTreeNode): HtmlTreeNode | undefined => {
  if (node.tagName === 'img') return node;
  if (node.tagName !== 'a' && node.tagName !== 'span') return;

  const children = node.children?.filter(
    (child) =>
      !(
        child.tagName === 'svg' &&
        (child.properties?.ariaHidden === 'true' || child.properties?.ariaHidden === true)
      )
  );
  const child = children?.length === 1 ? children[0] : undefined;
  return child ? contentImage(child) : undefined;
};

const toImageFigure = (node: HtmlTreeNode): HtmlTreeNode => {
  const content = node.children?.length === 1 ? node.children[0] : undefined;
  if (!content) {
    return node;
  }

  const image = contentImage(content);
  if (!image) {
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
      className: ['ui-markdown-figure']
    },
    children: [
      content,
      {
        type: 'element',
        tagName: 'figcaption',
        properties: {
          className: ['ui-media-caption']
        },
        children: [
          {
            type: 'text',
            value: title.trim()
          }
        ]
      }
    ]
  };
};

const processImages = (node: HtmlTreeNode, eagerImages: boolean): void => {
  if (node.tagName === 'img') {
    node.properties = node.properties ?? {};
    node.properties.loading = eagerImages ? 'eager' : 'lazy';
    node.properties.decoding = 'async';
  }

  if (!node.children) {
    return;
  }

  node.children = node.children.map((child) => {
    processImages(child, eagerImages);
    return child.tagName === 'p' ? toImageFigure(child) : child;
  });
};

export const rehypeImageFigures: Plugin<[], HtmlTreeNode> = () => (tree, file) => {
  processImages(tree, file.data.eagerImages === true);
};
