import type { Plugin } from 'unified';

import type { HtmlTreeNode } from './html-tree.types';

const IDREF_PROPERTIES: ReadonlySet<string> = new Set([
  'ariaActiveDescendant',
  'ariaControls',
  'ariaDescribedBy',
  'ariaDetails',
  'ariaErrorMessage',
  'ariaFlowTo',
  'ariaLabelledBy',
  'ariaOwns',
  'htmlFor',
  'headers',
  'list',
  'form',
  'itemRef',
  'popoverTarget',
  'commandFor'
]);

const visitNodes = (node: HtmlTreeNode, action: (node: HtmlTreeNode) => void): void => {
  action(node);
  node.children?.forEach((child) => visitNodes(child, action));
};

const localHref = (href: string, ids: ReadonlyMap<string, string>): string => {
  if (!href.startsWith('#')) {
    return href;
  }

  const fragment = href.slice(1);
  let decoded: string;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    // An invalid escape is not a resolvable URL fragment.
    return href;
  }

  const target = ids.get(decoded);
  return target ? `#${fragment === decoded ? target : encodeURIComponent(target)}` : href;
};

const localIdRefs = (value: unknown, ids: ReadonlyMap<string, string>): unknown => {
  if (Array.isArray(value)) {
    return value.map((id: unknown) => (typeof id === 'string' ? (ids.get(id) ?? id) : id));
  }

  return typeof value === 'string'
    ? value.replace(/[^\t\n\f\r ]+/gu, (id) => ids.get(id) ?? id)
    : value;
};

/** Collect the final HAST targets once, then scope only references to those targets. */
export const rehypeLocalIds: Plugin<[Map<string, string>, string | undefined], HtmlTreeNode> =
  (ids, prefix) => (tree) => {
    visitNodes(tree, (node) => {
      const id = node.properties?.id;
      if (typeof id === 'string') {
        ids.set(id, `${prefix ?? ''}${id}`);
      }
    });

    if (!prefix) {
      return;
    }

    visitNodes(tree, (node) => {
      if (!node.properties) {
        return;
      }

      for (const [key, value] of Object.entries(node.properties)) {
        if (key === 'id' && typeof value === 'string') {
          node.properties[key] = ids.get(value) ?? value;
        } else if (key === 'href' && typeof value === 'string') {
          node.properties[key] = localHref(value, ids);
        } else if (IDREF_PROPERTIES.has(key)) {
          node.properties[key] = localIdRefs(value, ids);
        }
      }
    });
  };
