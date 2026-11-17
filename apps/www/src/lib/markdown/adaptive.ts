import { resolveMarkdownResourceReferences } from '@shelkovo/markdown';

import type {
  AdaptiveBlocks,
  AdaptiveNode,
  AdaptiveOutput,
  AdaptiveScanNode
} from './adaptive.types';

const markers = new Set([':::adaptive', '::mobile', ':::']);

const fail = (source: string, node: AdaptiveScanNode, reason: string): never => {
  const point = node.position?.start;
  throw new Error(`${source}:${point?.line ?? 1}:${point?.column ?? 1}: adaptive: ${reason}`);
};

const marker = (node: AdaptiveNode): string | undefined => {
  if (node.type !== 'paragraph' || node.children.length !== 1) return;
  const text = node.children[0];
  return text?.type === 'text' && markers.has(text.value) ? text.value : undefined;
};

const checkContent = (node: AdaptiveScanNode, source: string, inside: boolean): void => {
  if (node.type === 'code' || node.type === 'inlineCode') return;
  if (node.type === 'text' && node.value?.split('\n').some((line) => markers.has(line.trim()))) {
    fail(source, node, 'markers must be separate root-level paragraphs with blank lines');
  }
  if (inside && (node.type === 'heading' || node.value === '[TOC]')) {
    fail(source, node, 'keep shared headings and TOC outside the block');
  }
  for (const child of node.children ?? []) checkContent(child, source, inside);
};

const wrapper = (nodes: AdaptiveNode[], className: string, wide = false): AdaptiveNode => {
  const node: Extract<AdaptiveNode, { type: 'blockquote' }> = {
    type: 'blockquote',
    data: {
      hName: 'div',
      hProperties: {
        className: [className]
      }
    },
    // These are whole root-level Markdown blocks, never inline children.
    children: nodes as AdaptiveBlocks
  };
  if (wide && node.data?.hProperties) {
    node.data.hProperties['data-pagefind-ignore'] = 'all';
    node.data.hProperties['data-search-adaptive-copy'] = '';
  }
  return node;
};

/** Keep both views in one document so references, mentions and anchors share their context. */
export const transformAdaptive = (
  nodes: readonly AdaptiveNode[],
  output: AdaptiveOutput,
  source = 'KB Markdown'
): AdaptiveNode[] => {
  if (!nodes.some((node) => marker(node) === ':::adaptive')) {
    // Still diagnose broken known markers, without rewriting ordinary documents.
    for (const node of nodes) checkContent(node, source, false);
    return [...nodes];
  }
  const result: AdaptiveNode[] = [];
  let wide: AdaptiveNode[] | undefined;
  let mobile: AdaptiveNode[] | undefined;
  let opening: AdaptiveNode | undefined;

  const content = output === 'mobile' ? resolveMarkdownResourceReferences(nodes) : nodes;
  for (const node of content) {
    const value = marker(node);
    if (value === ':::adaptive') {
      if (wide) fail(source, node, 'nested blocks are not supported');
      wide = [];
      opening = node;
    } else if (value === '::mobile') {
      if (!wide || mobile || !wide.length) fail(source, node, 'expected one non-empty wide view');
      mobile = [];
    } else if (value === ':::') {
      if (!wide || !mobile?.length) return fail(source, node, 'expected a non-empty mobile view');
      if (output === 'mobile') result.push(...mobile);
      else {
        result.push(
          wrapper(
            [wrapper(wide, 'ui-adaptive__wide', true), wrapper(mobile, 'ui-adaptive__mobile')],
            'ui-adaptive'
          )
        );
      }
      wide = undefined;
      mobile = undefined;
      opening = undefined;
    } else {
      checkContent(node, source, !!wide);
      if (mobile) mobile.push(node);
      else if (wide) wide.push(node);
      else result.push(node);
    }
  }
  if (opening) fail(source, opening, 'missing ::mobile or closing :::');
  return result;
};
