import {
  formatTextHtml,
  TYPOGRAPHY_BLOCK_TAGS,
  TYPOGRAPHY_SKIP_TAGS,
  TYPOGRAPHY_WRAPPER_CLASSES
} from '@shelkovo/typography';
import { htmlToHast, type HastContent, type HastNode, type HastPluginDefinition } from 'satteri';

import type { HtmlTreeNode } from './html-tree.types';
import type { TypographyNodeReplacement } from './typography.types';

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

/** Repair node-local line-start quotes using the surrounding inline flow. */
function alignTreeQuotes(root: HtmlTreeNode, replace: TypographyNodeReplacement): void {
  let hasContent = false;
  let lastText: HtmlTreeNode | undefined;
  let lastParent: HtmlTreeNode | undefined;

  const visit = (parent: HtmlTreeNode): void => {
    // Rehype replacements can splice an earlier sibling while this walk runs.
    for (const node of parent.children?.slice() ?? []) {
      const tag = node.tagName?.toLowerCase();
      if (tag && TYPOGRAPHY_BLOCK_TAGS.has(tag)) {
        if (!isProtected(node)) {
          alignTreeQuotes(node, replace);
        }
        hasContent = false;
        lastText = undefined;
      } else if (node.type === 'text' && typeof node.value === 'string') {
        if (/\n\n[ \u00A0]*$/u.test(node.value)) {
          hasContent = false;
        } else if (/\S/u.test(node.value)) {
          hasContent = true;
        }
        lastText = /[ \u00A0\n]$/u.test(node.value) ? node : undefined;
        lastParent = parent;
      } else if (tag === 'span' && classesOf(node).includes('typograf-oa-n-lquote')) {
        if (hasContent) {
          const previous = lastText?.value;
          if (lastText && lastParent && previous) {
            const replacements: HtmlTreeNode[] = [];
            if (previous.length > 1) {
              replacements.push({ type: 'text', value: previous.slice(0, -1) });
            }
            replacements.push({
              type: 'element',
              tagName: 'span',
              properties: { className: ['typograf-oa-sp-lquote'] },
              children: [{ type: 'text', value: previous.slice(-1) }]
            });
            replace(lastText, lastParent, replacements);
            replace(node, parent, [
              {
                ...node,
                properties: {
                  ...node.properties,
                  className: classesOf(node).map((name) =>
                    name === 'typograf-oa-n-lquote' ? 'typograf-oa-lquote' : name
                  )
                }
              }
            ]);
          } else {
            replace(node, parent, node.children ?? []);
          }
        }
        hasContent = true;
        lastText = undefined;
      } else if (isProtected(node) || tag === 'img' || tag === 'input' || node.type === 'raw') {
        if (
          tag !== 'script' &&
          tag !== 'style' &&
          !classesOf(node).includes('typograf-oa-sp-lquote')
        ) {
          hasContent = true;
          lastText = undefined;
        }
      } else {
        visit(node);
      }
    }
  };
  visit(root);
}

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
export function rehypeTypograf() {
  return (tree: HtmlTreeNode): void => {
    visitText(tree);
    alignTreeQuotes(tree, (node, parent, replacements) => {
      parent.children?.splice(parent.children.indexOf(node), 1, ...replacements);
    });
  };
}

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
  },
  after(root, ctx) {
    alignTreeQuotes(root, (node, _parent, replacements) => {
      ctx.replaceNode(node as HastNode, replacements as HastContent[]);
    });
  }
});
