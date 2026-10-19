import { md } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';

import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';

import {
  editorialMapCaption,
  resolveEditorialMapSelection,
  transformEditorialMapNodes
} from './editorial-maps';
import type { EditorialMapBlock, EditorialMapSelectionResolver } from './editorial-maps.types';

const encodedGeometry = (map: EditorialMapBlock, source: string): string => {
  const result = EditorialMapDataSchema.safeParse(map.geometry);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const index =
          issue.path[0] === 'features' && typeof issue.path[1] === 'number'
            ? issue.path[1]
            : undefined;
        const id = index === undefined ? undefined : map.geometry.features[index]?.id;
        const path = issue.path.join('.') || 'root';
        const fields =
          issue.code === 'unrecognized_keys'
            ? issue.keys.map((key) => `${path}.${key}`).join(', ')
            : path;
        return `${fields}${index === undefined ? '' : ` [feature ${index}${id === undefined ? '' : ` (ID ${JSON.stringify(id)})`}]`}: ${issue.message}`;
      })
      .join('; ');
    throw new Error(
      `${source} map insertion ${map.index} has invalid prepared geometry: ${details}`
    );
  }
  return JSON.stringify(result.data)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
};

const mapFigure = (
  map: EditorialMapBlock,
  source: string,
  reserveId: (base: string) => string,
  resolver?: EditorialMapSelectionResolver
) => {
  const resolved = resolveEditorialMapSelection(map, source, resolver);
  const prepared = {
    ...map,
    geometry: {
      ...map.geometry,
      features: [...resolved.geometry.features, ...map.geometry.features]
    }
  };
  const caption = editorialMapCaption(map);
  const hasName = !!map.geometry.metadata?.name?.trim();
  const id = reserveId(`editorial-map-${map.index}`);
  const figure = md.paragraph('');
  const label = { type: 'text' as const, value: caption ?? '' };
  const captionContent = map.url
    ? [{ type: 'element' as const, tagName: 'a', properties: { href: map.url }, children: [label] }]
    : [label];

  figure.data = {
    hName: 'figure',
    hProperties: {
      className: ['ui-editorial-map', 'map-frame'],
      id: hasName ? undefined : id
    },
    hChildren: [
      {
        type: 'element',
        tagName: 'editorial-map',
        properties: {
          dataGeometry: encodedGeometry(prepared, source),
          dataParcelLabels: JSON.stringify(resolved.parcelLabels)
            .replaceAll('<', '\\u003c')
            .replaceAll('>', '\\u003e')
            .replaceAll('&', '\\u0026'),
          dataPagefindIgnore: 'all'
        },
        children: []
      },
      ...(caption
        ? [
            {
              type: 'element' as const,
              tagName: 'figcaption',
              properties: { className: ['ui-editorial-map__caption', 'map-frame__caption'] },
              children: hasName
                ? [
                    {
                      type: 'element' as const,
                      tagName: 'h3',
                      properties: { className: ['ui-editorial-map__title'], id },
                      children: captionContent
                    }
                  ]
                : captionContent
            }
          ]
        : [])
    ]
  };

  return figure;
};

/** The package has already resolved the authored TOC and reserved heading IDs. */
export const transformEditorialMaps =
  (source: string, resolver?: EditorialMapSelectionResolver): MarkdownAstTransform =>
  (document, reserveId) => {
    document.children = transformEditorialMapNodes(document.children, source, (_node, map) => [
      mapFigure(map, source, reserveId, resolver)
    ]);
  };
