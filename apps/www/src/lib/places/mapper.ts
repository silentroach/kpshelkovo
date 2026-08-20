import {
  preprocessSiteMarkdown,
  preprocessSiteMarkdownContent,
} from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';

import { placeCanonical, placeMarkdownUrl, placeUrl } from './routes';
import type {
  Place,
  PlaceContact,
  PlaceCoordinates,
  PlaceEntry,
} from './types';

const buildYandexMapUrl = (coordinates: PlaceCoordinates): string =>
  `https://yandex.ru/maps/?pt=${coordinates.lng},${coordinates.lat}&z=18&l=map`;

export const mapRawPlace = (
  entry: PlaceEntry,
  opts?: {
    readonly contact?: PlaceContact;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): Place => {
  const markdown = entry.body?.trim() ?? '';
  const coordinates = entry.data.location.coordinates;
  const body = opts?.mentionRegistry
    ? preprocessSiteMarkdownContent(
        markdown,
        `place "${entry.id}" body`,
        opts.mentionRegistry,
      )
    : preprocessSiteMarkdown(markdown);

  return {
    slug: entry.id,
    name: entry.data.title,
    category: entry.data.category,
    marker: entry.data.marker,
    status: entry.data.status,
    summary: entry.data.summary,
    searchAliases: entry.data.search_aliases,
    body: body.markdown,
    mentions: body.mentions,
    address: entry.data.location.address,
    coordinates,
    mapUrl: entry.data.location.map_url ?? buildYandexMapUrl(coordinates),
    openingHours: entry.data.opening_hours
      ? {
          description: entry.data.opening_hours.description,
          periods: entry.data.opening_hours.periods.map((period) => ({
            days: period.days,
            opensAt: period.opens_at,
            closesAt: period.closes_at,
          })),
        }
      : undefined,
    contact: opts?.contact,
    url: placeUrl(entry.id),
    markdownUrl: placeMarkdownUrl(entry.id),
    canonical: placeCanonical(entry.id),
  };
};
