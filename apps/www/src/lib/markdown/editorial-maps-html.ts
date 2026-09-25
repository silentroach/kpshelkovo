import { md } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';

import { prepareEditorialGeometry } from '@/lib/geometry/editorial-display';
import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';

import { editorialMapCaption, transformEditorialMapNodes } from './editorial-maps';
import type { EditorialMapBlock } from './editorial-maps.types';

const encodedGeometry = (map: EditorialMapBlock, source: string): string => {
  const result = EditorialMapDataSchema.safeParse(prepareEditorialGeometry(map.geometry));
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

const mapFigure = (map: EditorialMapBlock, source: string, reserveId: (base: string) => string) => {
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
      className: ['ui-editorial-map'],
      id: hasName ? undefined : id
    },
    hChildren: [
      {
        type: 'element',
        tagName: 'editorial-map',
        properties: { dataGeometry: encodedGeometry(map, source), dataPagefindIgnore: 'all' },
        children: []
      },
      ...(caption
        ? [
            {
              type: 'element' as const,
              tagName: 'figcaption',
              properties: { className: ['ui-editorial-map__caption'] },
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
  (source: string): MarkdownAstTransform =>
  (document, reserveId) => {
    document.children = transformEditorialMapNodes(document.children, source, (_node, map) => [
      mapFigure(map, source, reserveId)
    ]);
  };
