import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import { placesDataUrl, placesMarkdownUrl, placesUrl } from './routes';
import type { Place, PlaceMentionRef, PlaceWithBacklinks } from './types';
import {
  formatPlaceBacklinkDate,
  formatPlaceBacklinkKind,
  formatPlaceCategory,
  formatPlaceStatus,
  placeBacklinkGroups,
} from './view';

const serialize = (
  children: Parameters<typeof createMarkdownDocument>[0]['children'],
): string => serializeMarkdownDocument(createMarkdownDocument({ children }));

const placeLine = (place: Place) =>
  md.listItem([
    md.paragraph([
      md.link(absoluteUrl(place.markdownUrl), place.name),
      md.text(` — ${place.summary}`),
    ]),
  ]);

const inline = (value: string): string => value.replace(/\s+/gu, ' ').trim();

const backlinkLine = (backlink: PlaceMentionRef) => {
  const meta = [
    formatPlaceBacklinkKind(backlink.kind),
    formatPlaceBacklinkDate(backlink),
  ].filter((value): value is string => Boolean(value));
  const details = meta.length > 0 ? ` — ${meta.join('; ')}` : '';

  return md.listItem([
    md.paragraph([
      md.link(absoluteUrl(backlink.markdownUrl), backlink.title),
      ...(details ? [md.text(details)] : []),
    ]),
    ...(backlink.excerpt ? [md.paragraph(inline(backlink.excerpt))] : []),
  ]);
};

const backlinksSection = (place: PlaceWithBacklinks) => {
  const groups = placeBacklinkGroups(place.backlinks);

  return [
    md.heading(2, 'Где упоминается'),
    ...(groups.length > 0
      ? groups.flatMap((group) => [
          md.heading(3, group.label),
          md.list(group.items.map(backlinkLine)),
        ])
      : [md.list([md.listItem('Пока публичных упоминаний не найдено.')])]),
  ];
};

export const buildPlacesMarkdown = (places: readonly Place[]): string =>
  serialize([
    md.heading(1, 'Карта Шелково'),
    md.paragraph(
      'Текстовый список мест и объектов, отмеченных на общей карте Шелково.',
    ),
    md.paragraph([
      md.text('Интерактивная карта: '),
      md.link(absoluteUrl(placesUrl()), absoluteUrl(placesUrl())),
    ]),
    md.paragraph([
      md.text('Данные для интерактивной карты: '),
      md.link(absoluteUrl(placesDataUrl()), absoluteUrl(placesDataUrl())),
    ]),
    md.heading(2, 'Места'),
    md.list(
      places.length > 0
        ? places.map(placeLine)
        : [md.listItem('Места пока не опубликованы.')],
    ),
  ]);

export const buildPlaceMarkdown = (place: PlaceWithBacklinks): string =>
  serialize([
    md.heading(1, place.name),
    md.paragraph(place.summary),
    ...(place.body ? parseMarkdownFragment(place.body) : []),
    md.heading(2, 'Сведения'),
    md.list([
      md.listItem(`Категория: ${formatPlaceCategory(place.category)}`),
      md.listItem(`Статус: ${formatPlaceStatus(place.status)}`),
      ...(place.address ? [md.listItem(`Адрес: ${place.address}`)] : []),
      ...(place.openingHours
        ? [md.listItem(`Время работы: ${place.openingHours.description}`)]
        : []),
      md.listItem(
        `Координаты: ${place.coordinates.lat}, ${place.coordinates.lng}`,
      ),
    ]),
    md.heading(2, 'Ссылки'),
    md.list([
      md.listItem([
        md.paragraph([
          md.link(absoluteUrl(place.mapUrl), 'Открыть в Яндекс Картах'),
        ]),
      ]),
      ...(place.contact
        ? [
            md.listItem([
              md.paragraph([
                md.link(
                  absoluteUrl(place.contact.url),
                  'Контакты и отзывы в «Сарафане»',
                ),
              ]),
            ]),
          ]
        : []),
      md.listItem([
        md.paragraph([
          md.link(absoluteUrl(placesMarkdownUrl()), 'Все места на карте'),
        ]),
      ]),
    ]),
    ...backlinksSection(place),
  ]);
