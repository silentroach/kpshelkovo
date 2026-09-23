import { md, parseMarkdownFragment } from '@shelkovo/markdown';

import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';

import type { EditorialMapBlock } from './editorial-maps.types';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type CodeNode = Extract<MarkdownNode, { type: 'code' }>;
type MarkdownBlock = ReturnType<typeof md.listItem>['children'][number];

const mapUrl = (meta: string | undefined, source: string): string | undefined => {
  if (!meta) {
    return;
  }

  const value = meta.trim();
  if (!/^https?:\/\/[^\s"'`<>{}()[\]\\]+$/iu.test(value)) {
    throw new Error(`${source} has invalid map URL "${value}"`);
  }

  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) {
      throw new Error('invalid web URL');
    }
  } catch {
    throw new Error(`${source} has invalid map URL "${value}"`);
  }

  return value;
};

/** Shared by early loader validation and the future HTML/companion AST transforms. */
export const parseEditorialMapCode = (
  node: CodeNode,
  source: string,
  index: number
): EditorialMapBlock => {
  const context = `${source} map insertion ${index}`;
  const url = mapUrl(node.meta ?? undefined, context);
  let input: unknown;

  try {
    input = JSON.parse(node.value);
  } catch (error) {
    throw new Error(`${context} has invalid JSON: ${String(error)}`);
  }

  return { index, url, geometry: parseEditorialGeometry(input, context) };
};

export const editorialMapCaption = (map: EditorialMapBlock): string | undefined => {
  const name = map.geometry.metadata?.name;
  return name?.trim() ? name : map.url ? 'Открыть карту' : undefined;
};

/** Replace block code in document order, including block quotes, lists and footnotes. */
export const transformEditorialMapNodes = (
  nodes: readonly MarkdownNode[],
  source: string,
  replacement: (node: CodeNode, map: EditorialMapBlock) => readonly MarkdownBlock[]
): MarkdownNode[] => {
  let index = 0;
  const block = (node: MarkdownBlock): MarkdownBlock[] => {
    if (node.type === 'code' && node.lang === 'map') {
      index += 1;
      return [...replacement(node, parseEditorialMapCode(node, source, index))];
    }
    if (node.type === 'blockquote') {
      return [{ ...node, children: node.children.flatMap(block) }];
    }
    if (node.type === 'list') {
      return [
        {
          ...node,
          children: node.children.map((item) => ({
            ...item,
            children: item.children.flatMap(block)
          }))
        }
      ];
    }
    return [node];
  };

  const result: MarkdownNode[] = [];
  for (const node of nodes) {
    if (node.type === 'footnoteDefinition') {
      result.push({ ...node, children: node.children.flatMap(block) });
    } else if (node.type === 'code' || node.type === 'blockquote' || node.type === 'list') {
      result.push(...block(node));
    } else {
      result.push(node);
    }
  }
  return result;
};

/** Parses real code nodes, leaving source Markdown and mention-protected code unchanged. */
export const extractEditorialMaps = (
  markdown: string,
  source: string
): readonly EditorialMapBlock[] => {
  const maps: EditorialMapBlock[] = [];

  const visit = (node: MarkdownNode): void => {
    if (node.type === 'code' && node.lang === 'map') {
      maps.push(parseEditorialMapCode(node, source, maps.length + 1));
    } else if ('children' in node) {
      node.children.forEach(visit);
    }
  };

  parseMarkdownFragment(markdown).forEach(visit);
  return maps;
};
