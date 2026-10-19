import { md, parseMarkdownFragment } from '@shelkovo/markdown';

import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';
import { EditorialParcelLabelsSchema } from '@/lib/geometry/editorial-map-labels-schema';
import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';

import {
  EditorialMapSourceKindSchema,
  EditorialMapSourceSchema
} from './editorial-map-source-schema';
import type {
  EditorialMapBlock,
  EditorialMapSelection,
  EditorialMapSelectionResolver,
  EditorialMapResolvedSelection
} from './editorial-maps.types';

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

/** Parse and prepare own geometry without resolving references or loading datasets. */
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

  const kind = EditorialMapSourceKindSchema.safeParse(input);
  if (
    kind.success &&
    kind.data.type === 'FeatureCollection' &&
    kind.data.sets === undefined &&
    kind.data.parcels === undefined &&
    kind.data.places === undefined &&
    kind.data.outline === undefined
  ) {
    return { index, url, geometry: parseEditorialGeometry(input, context) };
  }
  const result = EditorialMapSourceSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`${context} has invalid map definition: ${result.error.message}`);
  }
  const raw = result.data;
  const selection: EditorialMapSelection = {
    sets: raw.sets,
    parcels: raw.parcels,
    places: raw.places,
    outline: raw.outline
  };
  if (!raw.features.length && !selectionHasReferences(selection)) {
    throw new Error(`${context} requires at least one feature or reference`);
  }
  const geometry = raw.features.length
    ? parseEditorialGeometry(
        { type: 'FeatureCollection', metadata: raw.metadata, features: raw.features },
        context
      )
    : { type: 'FeatureCollection' as const, metadata: raw.metadata, features: [] };
  return { index, url, geometry, selection };
};

const selectionHasReferences = (selection: EditorialMapSelection): boolean =>
  selection.sets.length + selection.parcels.length + selection.places.length > 0;

/** Resolve references only; the author geometry is prepared separately by the parser. */
export const resolveEditorialMapSelection = (
  map: EditorialMapBlock,
  source: string,
  resolver?: EditorialMapSelectionResolver
): EditorialMapResolvedSelection => {
  const context = `${source} map insertion ${map.index}`;
  if (!map.selection || !selectionHasReferences(map.selection)) {
    return { geometry: { type: 'FeatureCollection', features: [] }, parcelLabels: [] };
  }
  if (!resolver) throw new Error(`${context} requires an editorial map resolver`);
  try {
    const resolved = resolver(map.selection, context);
    EditorialMapDataSchema.parse({
      type: 'FeatureCollection',
      metadata: map.geometry.metadata,
      features: [...resolved.geometry.features, ...map.geometry.features]
    });
    const parcelLabels = EditorialParcelLabelsSchema.parse(resolved.parcelLabels);
    return { geometry: resolved.geometry, parcelLabels };
  } catch (error) {
    throw new Error(`${context} has invalid resolved map: ${String(error)}`);
  }
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

export const hasEditorialMapReferences = (markdown: string, source: string): boolean =>
  extractEditorialMaps(markdown, source).some(
    (map) => !!map.selection && selectionHasReferences(map.selection)
  );
