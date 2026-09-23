import { md, parseMarkdownFragment } from '@shelkovo/markdown';

import { editorialMapCaption, transformEditorialMapNodes } from './editorial-maps';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

/** Add one plain-text caption after each original map code node; do not modify the body. */
export const appendEditorialMapCaptions = (
  nodes: readonly MarkdownNode[],
  source: string
): readonly MarkdownNode[] =>
  transformEditorialMapNodes(nodes, source, (node, map) => {
    const caption = editorialMapCaption(map);

    return [
      md.code(node.value, node.lang ?? undefined, node.meta ?? undefined),
      ...(caption ? [md.paragraph(map.url ? [md.link(map.url, caption)] : [md.text(caption)])] : [])
    ];
  });
