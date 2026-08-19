import {
  preprocessSiteMarkdown,
  preprocessSiteMarkdownContent,
} from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';

import { placeCanonical, placeMarkdownUrl, placeUrl } from './routes';
import type { Place, PlaceContact, PlaceEntry } from './types';

export const mapRawPlace = (
  entry: PlaceEntry,
  opts?: {
    readonly contact?: PlaceContact;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): Place => {
  const markdown = entry.body?.trim() ?? '';
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
    body: body.markdown,
    mentions: body.mentions,
    address: entry.data.location.address,
    coordinates: entry.data.location.coordinates,
    mapUrl: entry.data.location.map_url,
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
    evidence: entry.data.evidence
      ? {
          sourceUrl: entry.data.evidence.source_url,
          checkedAt: new Date(
            `${entry.data.evidence.checked_at}T00:00:00.000Z`,
          ),
          checkedIso: entry.data.evidence.checked_at,
        }
      : undefined,
    updatedAt: new Date(`${entry.data.updated_at}T00:00:00.000Z`),
    updatedIso: entry.data.updated_at,
    url: placeUrl(entry.id),
    markdownUrl: placeMarkdownUrl(entry.id),
    canonical: placeCanonical(entry.id),
  };
};
