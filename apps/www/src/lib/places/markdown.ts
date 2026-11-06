import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';
import type { StatusDataset } from '@/lib/status/types';

import { selectMapPlaces } from './map-selection';
import { toPlaceMarkdownPublic } from './markdown-public';
import { getPlaceStatusContext } from './related';
import { placesDataUrl, placesUrl } from './routes';
import type { Place, PlaceMentionRef, PlaceWithBacklinks } from './types';
import { formatPlaceBacklinkDate, formatPlaceBacklinkKind, placeBacklinkGroups } from './view';

const serialize = (children: Parameters<typeof createMarkdownDocument>[0]['children']): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const placeLine = (place: Place) =>
  md.listItem([
    md.paragraph([
      md.link(absoluteUrl(place.markdownUrl), place.name),
      md.text(` — ${place.summary}`)
    ])
  ]);

const backlinkLine = (backlink: PlaceMentionRef, status?: Pick<StatusDataset, 'byId'>) => {
  const incident = backlink.section === 'status' ? status?.byId.get(backlink.sourceId) : undefined;
  const context = incident ? getPlaceStatusContext(incident) : undefined;
  const meta = [
    formatPlaceBacklinkKind(backlink.kind),
    context?.period ?? formatPlaceBacklinkDate(backlink),
    incident?.kind !== 'maintenance' ? context?.state.label : undefined
  ].filter((value): value is string => Boolean(value));
  const details = meta.length > 0 ? ` — ${meta.join('; ')}` : '';

  return md.listItem([
    md.paragraph([
      md.link(absoluteUrl(backlink.markdownUrl), backlink.title),
      ...(details ? [md.text(details)] : [])
    ]),
    ...(backlink.excerpt ? [md.paragraph(backlink.excerpt)] : [])
  ]);
};

const backlinksSection = (place: PlaceWithBacklinks, status?: Pick<StatusDataset, 'byId'>) => {
  const groups = placeBacklinkGroups(place.backlinks);

  return [
    md.heading(2, 'Где упоминается'),
    ...(groups.length > 0
      ? groups.flatMap((group) => [
          md.heading(3, group.label),
          md.list(group.items.map((backlink) => backlinkLine(backlink, status)))
        ])
      : [md.list([md.listItem('Пока публичных упоминаний не найдено.')])])
  ];
};

export const buildPlacesMarkdown = (places: readonly Place[]): string => {
  const visiblePlaces = selectMapPlaces(places);
  return serialize([
    md.heading(1, 'Карта Шелково'),
    md.paragraph('Текстовый список мест и объектов, отмеченных на общей карте Шелково.'),
    md.paragraph([
      md.text('Интерактивная карта: '),
      md.link(absoluteUrl(placesUrl()), absoluteUrl(placesUrl()))
    ]),
    md.paragraph([
      md.text('Данные для интерактивной карты: '),
      md.link(absoluteUrl(placesDataUrl()), absoluteUrl(placesDataUrl()))
    ]),
    md.heading(2, 'Места'),
    md.list(
      visiblePlaces.length > 0
        ? visiblePlaces.map(placeLine)
        : [md.listItem('Места пока не опубликованы.')]
    )
  ]);
};

export const buildPlaceMarkdown = (
  place: PlaceWithBacklinks,
  status?: Pick<StatusDataset, 'byId'>
): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: toPlaceMarkdownPublic(place),
      children: [
        md.heading(1, place.name),
        md.paragraph(place.summary),
        ...(place.body ? parseMarkdownFragment(place.body) : []),
        ...backlinksSection(place, status)
      ]
    })
  );
