import {
  formatTextHtml,
  TYPOGRAPHY_SKIP_TAGS,
  TYPOGRAPHY_WRAPPER_CLASSES
} from '@shelkovo/typography';
import { htmlToHast, type HastContent, type HastNode, type HastPluginDefinition } from 'satteri';

import type { HtmlTreeNode } from './html-tree.types';

const classesOf = (node: HtmlTreeNode): readonly unknown[] => {
  const value = node.properties?.className;
  return typeof value === 'string' ? value.split(/\s+/u) : Array.isArray(value) ? value : [];
};

const isProtected = (node: HtmlTreeNode): boolean => {
  const tag = node.tagName?.toLowerCase();
  if (tag && TYPOGRAPHY_SKIP_TAGS.has(tag)) {
    return true;
  }

  return (
    tag === 'span' &&
    classesOf(node).some((name) => typeof name === 'string' && TYPOGRAPHY_WRAPPER_CLASSES.has(name))
  );
};

/** The only text → AST boundary, shared by the rehype and Satteri adapters. */
function formatTextNode(value: string): HastContent[] {
  const withoutPrefix = value.trimStart();
  const core = withoutPrefix.trimEnd();
  const prefix = value.slice(0, value.length - withoutPrefix.length);
  const suffix = withoutPrefix.slice(core.length);
  if (!core) {
    return [{ type: 'text', value }];
  }

  const tree = htmlToHast(formatTextHtml(core), { fragment: true });
  if (tree.type !== 'root') {
    throw new Error('Typography HTML fragment must produce a HAST root');
  }

  const children: HastContent[] = tree.children;
  if (prefix) {
    children.unshift({ type: 'text', value: prefix });
  }
  if (suffix) {
    children.push({ type: 'text', value: suffix });
  }
  return children;
}

function visitText(node: HtmlTreeNode): void {
  if (isProtected(node) || !node.children) {
    return;
  }

  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && typeof child.value === 'string') {
      return formatTextNode(child.value);
    }
    visitText(child);
    return [child];
  });
}

/**
 * Rehype plugin for typography inside markdown/HTML AST text nodes.
 * Exported for framework markdown pipelines, for example Astro config.
 */
export const rehypeTypograf = () => visitText;

export const satteriTypograf = (): HastPluginDefinition => ({
  name: 'shelkovo-typograf',
  text(node, ctx) {
    if (!/\S/u.test(node.value)) {
      return;
    }

    let parent: Readonly<HastNode> | undefined = ctx.parent(node);
    while (parent) {
      if (isProtected(parent)) {
        return;
      }
      parent = ctx.parent(parent);
    }

    ctx.replaceNode(node, formatTextNode(node.value));
  }
});
