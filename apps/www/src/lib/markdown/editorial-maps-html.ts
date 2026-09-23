import { md } from '@shelkovo/markdown';
import type { MarkdownAstTransform } from '@shelkovo/markdown';

import { editorialMapCaption, transformEditorialMapNodes } from './editorial-maps';
import type { EditorialMapBlock } from './editorial-maps.types';

const encodedGeometry = (map: EditorialMapBlock): string =>
  JSON.stringify(map.geometry)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');

const mapFigure = (map: EditorialMapBlock, reserveId: (base: string) => string) => {
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
        properties: { dataGeometry: encodedGeometry(map), dataPagefindIgnore: 'all' },
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
      mapFigure(map, reserveId)
    ]);
  };
