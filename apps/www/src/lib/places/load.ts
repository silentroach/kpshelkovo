import { getCollection } from 'astro:content';
import { compareRuText } from '@shelkovo/format';

import { loadContactDetails } from '@/lib/contacts/load';
import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadPeopleMentionRegistry } from '@/lib/people/registry';

import { mapRawPlace } from './mapper';
import type { Place, PlaceEntry, PlacesDataset } from './types';

let cache: Promise<PlacesDataset> | undefined;

export const buildPlacesDataset = (
  entries: readonly PlaceEntry[],
  opts?: {
    readonly contactUrls?: ReadonlyMap<string, string>;
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): PlacesDataset => {
  const contactUrls = opts?.contactUrls ?? new Map<string, string>();
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
    loadContactDetails(),
    loadPeopleMentionRegistry(),
  ]);
  const contactUrls = new Map(
    contacts.map((contact) => [
      `${contact.category}/${contact.slug}`,
      contact.url,
    ]),
  );

  return buildPlacesDataset(entries, { contactUrls, mentionRegistry });
};

export const loadPlacesData = (): Promise<PlacesDataset> => {
  cache ??= buildPlacesData();

  return cache;
};

export const loadPlaces = async (): Promise<readonly Place[]> =>
  (await loadPlacesData()).places;

export const loadPlace = async (slug: string): Promise<Place | undefined> =>
  (await loadPlacesData()).bySlug.get(slug.trim());
