import type { Nodes, PhrasingContent, Root, RootContent } from 'mdast';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { directive } from 'micromark-extension-directive';
import type { Construct, Extension, State, Tokenizer } from 'micromark-util-types';
import type { Plugin } from 'unified';
import { z } from 'zod';

import type {} from './toc-annotations.types';

const parameters = z.object({
  title: z.string().trim().min(1),
  attributes: z.record(z.string(), z.string()).refine((value) => Object.keys(value).length === 0)
});

// Gate the upstream tokenizer, not its AST: unknown syntax (including
// @slug:case) remains ordinary Markdown with its original source offsets.
const knownName: Tokenizer = function (effects, ok, nok) {
  let value = '';
  effects.enter('data');
  const state: State = (code) => {
    if (code === 58 && value.length < 3) {
      value += ':';
      effects.consume(code);
      return state;
    }
    if (code !== null && code > 0 && /[a-z-]/u.test(String.fromCodePoint(code))) {
      value += String.fromCodePoint(code);
      effects.consume(code);
      return state;
    }
    effects.exit('data');
    return /^:{1,3}toc-(?:group|omit)$/u.test(value) &&
      !(code !== null && code > 0 && /[\w-]/u.test(String.fromCodePoint(code)))
      ? ok(code)
      : nok(code);
  };
  return state;
};

const selective = (construct: Construct): Construct => ({
  ...construct,
  tokenize(effects, ok, nok) {
    const start = construct.tokenize.call(this, effects, ok, nok);
    return effects.check({ tokenize: knownName }, start, nok);
  }
});

export const tocDirectiveSyntax = (): Extension => {
  const syntax = directive();
  const select = (value: Construct | readonly Construct[] | undefined): Construct[] =>
    (Array.isArray(value) ? value : value ? [value] : []).map(selective);
  return {
    text: { 58: select(syntax.text?.[58]) },
    flow: { 58: select(syntax.flow?.[58]) }
  };
};

export const remarkTocSyntax: Plugin<[], Root> = function () {
  const data = this.data();
  (data.micromarkExtensions ??= []).push(tocDirectiveSyntax());
  (data.fromMarkdownExtensions ??= []).push(directiveFromMarkdown());
};

function failTocAnnotation(node: Nodes, message: string): never {
  const point = node.position?.start;
  throw new Error(`TOC annotation at ${point?.line ?? 1}:${point?.column ?? 1}: ${message}`);
}

const inlineText = (nodes: readonly PhrasingContent[], omit = false): string =>
  nodes
    .map((node) => {
      if (omit && node.type === 'textDirective') return '';
      if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
      if ('value' in node) return node.value;
      if ('children' in node) return inlineText(node.children, omit);
      return '';
    })
    .join('');

const hasOmission = (nodes: readonly PhrasingContent[]): boolean =>
  nodes.some(
    (node) => node.type === 'textDirective' || ('children' in node && hasOmission(node.children))
  );

export const prepareTocAnnotations = (tree: Root, source?: string): Root => {
  const walk = (node: Nodes, heading: boolean, rootChild: boolean): void => {
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') return;
    if (node.type === 'text') {
      const raw = source?.slice(node.position?.start.offset, node.position?.end.offset);
      if (raw && /(^|[^\\]):{1,3}toc-(?:group|omit)(?![\w-])/u.test(raw)) {
        failTocAnnotation(node, 'malformed known directive');
      }
      return;
    }
    if (
      node.type === 'textDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'containerDirective'
    ) {
      if (node.type === 'containerDirective')
        failTocAnnotation(node, 'container directives are not supported');
      if (node.name === 'toc-group') {
        if (node.type !== 'leafDirective' || !rootChild)
          failTocAnnotation(node, 'toc-group must be a standalone root-level leaf directive');
        const raw = source?.slice(node.position?.start.offset, node.position?.end.offset);
        if (raw?.trim() === '::toc-group' || node.data?.tocUnnamedGroup) {
          node.data = { ...node.data, tocUnnamedGroup: true };
          return;
        }
      }
      const result = parameters.safeParse({
        title: inlineText(node.children),
        attributes: node.attributes ?? {}
      });
      if (!result.success) failTocAnnotation(node, 'expected nonempty label and no attributes');
      if (node.name === 'toc-group') {
        node.children.forEach((child) => walk(child, false, false));
        return;
      }
      if (node.name !== 'toc-omit' || node.type !== 'textDirective' || !heading) {
        failTocAnnotation(node, 'toc-omit is only allowed inside a heading');
      }
    }
    if ('children' in node) {
      node.children.forEach((child) =>
        walk(child, heading || node.type === 'heading', node.type === 'root')
      );
    }
    if (node.type === 'heading' && hasOmission(node.children)) {
      const label = inlineText(node.children, true).trim();
      if (!label) failTocAnnotation(node, 'toc-omit leaves an empty TOC label');
      node.data = { ...node.data, tocTitle: node.data?.tocTitle ?? label };
      const unwrap = (children: PhrasingContent[]): PhrasingContent[] =>
        children.flatMap((child) => {
          if (child.type === 'textDirective') return unwrap(child.children);
          if ('children' in child) child.children = unwrap(child.children);
          return [child];
        });
      node.children = unwrap(node.children);
    }
  };
  walk(tree, false, false);
  let rootDepth = Infinity;
  let boundary: RootContent | undefined;
  tree.children.forEach((node) => {
    if (node.type === 'leafDirective') boundary = node;
    if (node.type === 'heading' && node.depth > 1) {
      rootDepth = Math.min(rootDepth, node.depth);
      if (boundary && node.depth > rootDepth)
        failTocAnnotation(boundary, 'group boundary splits a TOC branch');
      boundary = undefined;
    }
  });
  return tree;
};
