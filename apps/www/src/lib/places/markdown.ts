import {
  createMarkdownDocument,
  md,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import { placesMarkdownUrl, placesUrl } from './routes';
import type { Place } from './types';

export const PLACES_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, follow',
} as const;

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
    md.heading(2, 'Места'),
    md.list(
      places.length > 0
        ? places.map(placeLine)
        : [md.listItem('Места пока не опубликованы.')],
    ),
  ]);

export const buildPlaceMarkdown = (place: Place): string =>
  serialize([
    md.heading(1, place.name),
    md.paragraph(place.summary),
    md.heading(2, 'Расположение'),
    md.list([
      md.listItem(`Адрес: ${place.address}`),
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
      md.listItem([
        md.paragraph([
          md.link(
            absoluteUrl(place.contactUrl),
            'Меню, телефон и отзывы в «Сарафане»',
          ),
        ]),
      ]),
      md.listItem([
        md.paragraph([
          md.link(absoluteUrl(placesMarkdownUrl()), 'Все места на карте'),
        ]),
      ]),
    ]),
  ]);
