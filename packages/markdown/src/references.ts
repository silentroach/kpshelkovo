import type { Definition, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';

export const resolveMarkdownResourceReferences = (
  children: readonly RootContent[],
): readonly RootContent[] => {
  const document: Root = { type: 'root', children: [...children] };
  const definitions = new Map<string, Definition>();

  visit(document, 'definition', (node) => {
    if (!definitions.has(node.identifier)) {
      definitions.set(node.identifier, node);
    }
  });
  visit(document, 'linkReference', (node, index, parent) => {
    const definition = definitions.get(node.identifier);
    if (!definition || !parent || index === undefined) {
      return;
    }

    parent.children[index] = {
      type: 'link',
      children: node.children,
      url: definition.url,
      title: definition.title ?? undefined,
    };
    return index;
  });
  visit(document, 'imageReference', (node, index, parent) => {
    const definition = definitions.get(node.identifier);
    if (!definition || !parent || index === undefined) {
      return;
    }

    parent.children[index] = {
      type: 'image',
      alt: node.alt ?? undefined,
      url: definition.url,
      title: definition.title ?? undefined,
    };
    return index;
  });
  visit(document, 'definition', (_node, index, parent) => {
    if (!parent || index === undefined) {
      return;
    }

    parent.children.splice(index, 1);
    return index;
  });

  return document.children;
};
