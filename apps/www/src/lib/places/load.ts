import { getCollection } from 'astro:content';
import { compareRuText } from '@shelkovo/format';

import { loadContacts } from '@/lib/contacts/load';
import type { EntityMentionGraph, SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { loadSiteMentionGraph } from '@/lib/site-mention-graph';

import { createPlaceBacklinksFromGraph } from './backlinks';
import { parsePlaceGeometryFiles } from './geometry';
import { mapRawPlace } from './mapper';
import type {
  Place,
  PlaceEntry,
  PlaceGeometry,
  PlacesDataset,
  PlacesWithBacklinksDataset,
  PlaceWithBacklinks,
} from './types';

const rawPlaceGeometryFiles = import.meta.glob<string>(
  '../../data/places/*.geojson',
  { eager: true, import: 'default', query: '?raw' },
);
const placeGeometries = parsePlaceGeometryFiles(rawPlaceGeometryFiles);

let cache: Promise<PlacesDataset> | undefined;
let graphCache: Promise<PlacesWithBacklinksDataset> | undefined;

export const buildPlacesDataset = (
  entries: readonly PlaceEntry[],
  opts?: {
    readonly contactUrls?: ReadonlyMap<string, string>;
    readonly geometries?: ReadonlyMap<string, PlaceGeometry>;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): PlacesDataset => {
  const contactUrls = opts?.contactUrls ?? new Map<string, string>();
  const geometries = opts?.geometries ?? new Map();
  const placeSlugs = new Set(entries.map((entry) => entry.id));

  for (const slug of geometries.keys()) {
    if (!placeSlugs.has(slug)) {
      throw new Error(
        `place geometry "${slug}.geojson" has no matching Markdown place`,
      );
    }
  }

  const places = entries
    .map((entry) => {
      const contactId = entry.data.contact;
      const contactUrl = contactId ? contactUrls.get(contactId) : undefined;

      if (contactId && !contactUrl) {
        throw new Error(
          `place "${entry.id}" references missing contact "${contactId}"`,
        );
      }

      return mapRawPlace(entry, {
        contact:
          contactId && contactUrl
            ? { id: contactId, url: contactUrl }
            : undefined,
        geometry: geometries.get(entry.id),
        mentionRegistry: opts?.mentionRegistry,
      });
    })
    .sort(
      (a, b) => compareRuText(a.name, b.name) || compareRuText(a.slug, b.slug),
    );

  return {
    places,
    bySlug: new Map(places.map((place) => [place.slug, place] as const)),
  };
};

const buildPlacesData = async (): Promise<PlacesDataset> => {
  const [entries, contacts, mentionRegistry] = await Promise.all([
    getCollection('places'),
    loadContacts(),
    loadSiteMentionRegistry(),
  ]);
  const contactUrls = new Map(
    contacts.map((contact) => [
      `${contact.category}/${contact.slug}`,
      contact.url,
    ]),
  );

  return buildPlacesDataset(entries, {
    contactUrls,
    geometries: placeGeometries,
    mentionRegistry,
  });
};

export const loadPlacesData = (): Promise<PlacesDataset> => {
  cache ??= buildPlacesData();

  return cache;
};

export const buildPlacesGraphDataset = (
  places: PlacesDataset,
  graph: EntityMentionGraph,
): PlacesWithBacklinksDataset => {
  const enriched = places.places.map((place) => ({
    ...place,
    backlinks: createPlaceBacklinksFromGraph(graph, place.slug),
  }));

  return {
    places: enriched,
    bySlug: new Map(enriched.map((place) => [place.slug, place] as const)),
  };
};

const buildPlacesDataWithBacklinks =
  async (): Promise<PlacesWithBacklinksDataset> => {
    const [places, graph] = await Promise.all([
      loadPlacesData(),
      loadSiteMentionGraph(),
    ]);

    return buildPlacesGraphDataset(places, graph);
  };

export const loadPlacesDataWithBacklinks =
  (): Promise<PlacesWithBacklinksDataset> => {
    graphCache ??= buildPlacesDataWithBacklinks();

    return graphCache;
  };

export const loadPlaces = async (): Promise<readonly Place[]> =>
  (await loadPlacesData()).places;

export const loadPlace = async (slug: string): Promise<Place | undefined> =>
  (await loadPlacesData()).bySlug.get(slug.trim());

export const loadPlaceWithBacklinks = async (
  slug: string,
): Promise<PlaceWithBacklinks | undefined> =>
  (await loadPlacesDataWithBacklinks()).bySlug.get(slug.trim());
